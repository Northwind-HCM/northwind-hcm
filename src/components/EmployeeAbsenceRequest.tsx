"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import FormField from "@/components/FormField";

type Props = {
  companyId: string;
  employeeId: string;
};

type EmployeeData = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type Absence = {
  id: string;
  absenceType?: string;
  absenceLabel?: string;
  startDate?: string;
  endDate?: string;
  status?: "requested" | "approved" | "rejected";
  notes?: string;
};

const inputClass = "w-full rounded border p-3";

const absenceTypes = [
  { value: "vacation", label: "Urlaub" },
  { value: "sickness_without_certificate", label: "Krankheit ohne Attest" },
  { value: "sickness_with_certificate", label: "Krankheit mit Attest / eAU" },
  { value: "child_sickness", label: "Kind krank" },
  { value: "maternity_protection", label: "Mutterschutz" },
  { value: "parental_leave", label: "Elternzeit" },
  { value: "unpaid_leave", label: "Unbezahlte Freistellung" },
  { value: "special_leave", label: "Sonderurlaub" },
  { value: "care_leave", label: "Pflegezeit" },
  { value: "time_off_in_lieu", label: "Freizeitausgleich" },
  { value: "other", label: "Sonstige Abwesenheit" },
];

function getAbsenceLabel(value?: string) {
  return absenceTypes.find((item) => item.value === value)?.label || value || "-";
}

function getStatusLabel(status?: string) {
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return "Beantragt";
}

function getStatusClass(status?: string) {
  if (status === "approved") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

export default function EmployeeAbsenceRequest({
  companyId,
  employeeId,
}: Props) {
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    absenceType: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const employeeRef = doc(db, "companies", companyId, "employees", employeeId);
      const employeeSnap = await getDoc(employeeRef);

      if (employeeSnap.exists()) {
        setEmployee(employeeSnap.data() as EmployeeData);
      }

      const absencesSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "absences"),
          where("employeeId", "==", employeeId),
          orderBy("createdAt", "desc")
        )
      );

      const absenceData = absencesSnap.docs.map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      })) as Absence[];

      setAbsences(absenceData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Laden ❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId, employeeId]);

  function updateField(key: keyof typeof formData, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.absenceType || !formData.startDate || !formData.endDate) {
      setMessage("Bitte Art der Fehlzeit und Zeitraum vollständig ausfüllen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const absenceLabel = getAbsenceLabel(formData.absenceType);

      await addDoc(collection(db, "companies", companyId, "absences"), {
        employeeId,
        employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
        employeeEmail: employee?.email || "",
        absenceType: formData.absenceType,
        absenceLabel,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,
        status: "requested",
        requestedBy: employeeId,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      setFormData({
        absenceType: "",
        startDate: "",
        endDate: "",
        notes: "",
      });

      setMessage("Fehlzeit wurde beantragt ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Speichern ❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Lade Fehlzeiten...</p>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Meine Fehlzeiten</h2>
        <p className="text-sm text-gray-600">
          Beantragen Sie Urlaub, Krankheit oder andere Abwesenheiten.
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-4">
        <h3 className="font-semibold">Neue Fehlzeit beantragen</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Art der Fehlzeit">
            <select
              className={inputClass}
              value={formData.absenceType}
              onChange={(e) => updateField("absenceType", e.target.value)}
              required
            >
              <option value="">Bitte auswählen</option>
              {absenceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Von">
            <input
              type="date"
              className={inputClass}
              value={formData.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
              required
            />
          </FormField>

          <FormField label="Bis">
            <input
              type="date"
              className={inputClass}
              value={formData.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="Hinweise">
          <textarea
            className="min-h-24 w-full rounded border p-3"
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Optional: Hinweise zur Fehlzeit"
          />
        </FormField>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Sendet..." : "Fehlzeit beantragen"}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold">Meine bisherigen Anträge</h3>

        {absences.length === 0 ? (
          <p className="text-sm text-gray-600">
            Es liegen noch keine Fehlzeiten vor.
          </p>
        ) : (
          absences.map((absence) => (
            <div key={absence.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {absence.absenceLabel || getAbsenceLabel(absence.absenceType)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {absence.startDate || "-"} bis {absence.endDate || "-"}
                  </p>

                  {absence.notes && (
                    <p className="mt-2 text-sm text-gray-700">
                      {absence.notes}
                    </p>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                    absence.status
                  )}`}
                >
                  {getStatusLabel(absence.status)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}