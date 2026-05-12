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

  halfDay?: boolean;
  substitutePerson?: string;

  hospitalStay?: boolean;
  requiresEAU?: boolean;
  eAUStatus?: string;

  childName?: string;
  childBirthDate?: string;
  singleParent?: boolean;

  parentalLeavePartTime?: boolean;

  bgRelevant?: boolean;
};

const inputClass = "w-full rounded border p-3";

const initialFormData = {
  absenceType: "",
  startDate: "",
  endDate: "",
  notes: "",

  halfDay: false,
  substitutePerson: "",

  hospitalStay: false,

  childName: "",
  childBirthDate: "",
  singleParent: false,

  parentalLeavePartTime: false,
};

const absenceTypes = [
  { value: "vacation", label: "Urlaub" },
  { value: "sickness_without_certificate", label: "Krankheit ohne Attest" },
  { value: "sickness_with_certificate", label: "Krankheit mit Attest / eAU" },
  { value: "child_sickness", label: "Kind krank" },
  { value: "work_accident", label: "Arbeitsunfall" },
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

function isSicknessType(absenceType: string) {
  return (
    absenceType === "sickness_with_certificate" ||
    absenceType === "sickness_without_certificate"
  );
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
  const [formData, setFormData] = useState(initialFormData);

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

  function updateField(
    key: keyof typeof initialFormData,
    value: string | boolean
  ) {
    setFormData((prev) => ({
      ...prev,
      [key]: value as never,
    }));
  }

  async function handleSubmit() {
    if (!formData.absenceType || !formData.startDate || !formData.endDate) {
      setMessage("Bitte Art der Fehlzeit und Zeitraum vollständig ausfüllen.");
      return;
    }

    if (
      formData.absenceType === "child_sickness" &&
      (!formData.childName || !formData.childBirthDate)
    ) {
      setMessage("Bitte Name und Geburtsdatum des Kindes erfassen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const absenceLabel = getAbsenceLabel(formData.absenceType);
      const requiresEAU = formData.absenceType === "sickness_with_certificate";
      const bgRelevant = formData.absenceType === "work_accident";

      await addDoc(collection(db, "companies", companyId, "absences"), {
        employeeId,
        employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
        employeeEmail: employee?.email || "",

        absenceType: formData.absenceType,
        absenceLabel,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,

        halfDay: formData.halfDay,
        substitutePerson: formData.substitutePerson,

        hospitalStay: formData.hospitalStay,
        requiresEAU,
        eAUStatus: requiresEAU ? "to_be_requested" : "not_required",

        childName: formData.childName,
        childBirthDate: formData.childBirthDate,
        singleParent: formData.singleParent,

        parentalLeavePartTime: formData.parentalLeavePartTime,

        bgRelevant,

        status: "requested",
        requestedBy: employeeId,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      setFormData(initialFormData);

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

      <div className="space-y-4 rounded-xl border p-4">
        <h3 className="font-semibold">Neue Fehlzeit beantragen</h3>

        <div className="space-y-4">
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

          <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        {formData.absenceType === "vacation" && (
          <div className="space-y-4 rounded-xl border bg-gray-50 p-4">
            <h4 className="font-medium">Urlaubsdetails</h4>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.halfDay}
                onChange={(e) => updateField("halfDay", e.target.checked)}
              />
              Halber Urlaubstag
            </label>

            <FormField label="Vertretung">
              <input
                className={inputClass}
                value={formData.substitutePerson}
                onChange={(e) => updateField("substitutePerson", e.target.value)}
                placeholder="Optional"
              />
            </FormField>
          </div>
        )}

        {isSicknessType(formData.absenceType) && (
          <div className="space-y-4 rounded-xl border bg-blue-50 p-4">
            <h4 className="font-medium text-blue-900">Krankheitsdetails</h4>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.hospitalStay}
                onChange={(e) => updateField("hospitalStay", e.target.checked)}
              />
              Krankenhausaufenthalt / Sondernachweis
            </label>

            {formData.absenceType === "sickness_with_certificate" && (
              <div className="rounded-lg bg-white p-3 text-sm text-blue-900">
                Die eAU wird durch den Arbeitgeber bzw. Payroll abgerufen. Ein
                Upload der AU ist im Standardfall nicht erforderlich.
              </div>
            )}
          </div>
        )}

        {formData.absenceType === "child_sickness" && (
          <div className="space-y-4 rounded-xl border bg-pink-50 p-4">
            <h4 className="font-medium text-pink-900">Angaben zum Kind</h4>

            <FormField label="Name des Kindes">
              <input
                className={inputClass}
                value={formData.childName}
                onChange={(e) => updateField("childName", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Geburtsdatum des Kindes">
              <input
                type="date"
                className={inputClass}
                value={formData.childBirthDate}
                onChange={(e) => updateField("childBirthDate", e.target.value)}
                required
              />
            </FormField>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.singleParent}
                onChange={(e) => updateField("singleParent", e.target.checked)}
              />
              Alleinerziehend
            </label>

            <div className="rounded-lg bg-white p-3 text-sm text-pink-900">
              Payroll benötigt diese Angaben ggf. für Kinderkrankengeld und
              SV-relevante Prüfungen.
            </div>
          </div>
        )}

        {formData.absenceType === "work_accident" && (
          <div className="space-y-4 rounded-xl border bg-red-50 p-4">
            <h4 className="font-medium text-red-900">Arbeitsunfall</h4>

            <div className="rounded-lg bg-white p-3 text-sm text-red-900">
              Diese Abwesenheit ist BG-relevant und muss ggf. an die
              Berufsgenossenschaft gemeldet werden.
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.hospitalStay}
                onChange={(e) => updateField("hospitalStay", e.target.checked)}
              />
              Krankenhausaufenthalt
            </label>
          </div>
        )}

        {formData.absenceType === "parental_leave" && (
          <div className="space-y-4 rounded-xl border bg-gray-50 p-4">
            <h4 className="font-medium">Elternzeit</h4>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.parentalLeavePartTime}
                onChange={(e) =>
                  updateField("parentalLeavePartTime", e.target.checked)
                }
              />
              Teilzeit während Elternzeit
            </label>
          </div>
        )}

        <FormField label="Hinweise">
          <textarea
            className="min-h-24 w-full rounded border p-3"
            value={formData.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Optional: Hinweise zur Fehlzeit"
          />
        </FormField>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Sendet..." : "Fehlzeit beantragen"}
        </button>
      </div>

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

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {absence.halfDay && (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                        Halber Tag
                      </span>
                    )}

                    {absence.hospitalStay && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                        Krankenhaus / Sondernachweis
                      </span>
                    )}

                    {absence.requiresEAU && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">
                        eAU-Abruf erforderlich
                      </span>
                    )}

                    {absence.childName && (
                      <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-800">
                        Kind: {absence.childName}
                      </span>
                    )}

                    {absence.bgRelevant && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
                        BG-relevant
                      </span>
                    )}
                  </div>

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