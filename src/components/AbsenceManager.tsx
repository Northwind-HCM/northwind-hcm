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
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import FormField from "./FormField";
import { canApproveAbsence, type AppUser } from "../lib/auth/roles";

type Props = {
  companyId: string;
};

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type AbsenceStatus = "requested" | "approved" | "rejected";

type Absence = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
  absenceType?: string;
  absenceLabel?: string;
  startDate?: string;
  endDate?: string;
  status?: AbsenceStatus;
  notes?: string;
  requiresDocument?: boolean;
  payrollRelevant?: boolean;
};

const inputClass = "w-full rounded border p-3";

const absenceTypes = [
  {
    value: "vacation",
    label: "Urlaub",
    requiresDocument: false,
    payrollRelevant: true,
  },
  {
    value: "sickness_without_certificate",
    label: "Krankheit ohne Attest",
    requiresDocument: false,
    payrollRelevant: true,
  },
  {
    value: "sickness_with_certificate",
    label: "Krankheit mit Attest / eAU",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "child_sickness",
    label: "Kind krank",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "maternity_protection",
    label: "Mutterschutz",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "parental_leave",
    label: "Elternzeit",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "unpaid_leave",
    label: "Unbezahlte Freistellung",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "special_leave",
    label: "Sonderurlaub",
    requiresDocument: false,
    payrollRelevant: true,
  },
  {
    value: "care_leave",
    label: "Pflegezeit",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "public_holiday",
    label: "Feiertag",
    requiresDocument: false,
    payrollRelevant: false,
  },
  {
    value: "time_off_in_lieu",
    label: "Freizeitausgleich",
    requiresDocument: false,
    payrollRelevant: true,
  },
  {
    value: "other",
    label: "Sonstige Abwesenheit",
    requiresDocument: false,
    payrollRelevant: true,
  },
];

function getAbsenceType(value?: string) {
  return absenceTypes.find((item) => item.value === value);
}

function getAbsenceLabel(value?: string) {
  return getAbsenceType(value)?.label || value || "-";
}

function getStatusLabel(status?: AbsenceStatus) {
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return "Beantragt";
}

function getStatusClass(status?: AbsenceStatus) {
  if (status === "approved") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-yellow-100 text-yellow-800";
}

function canApproveForEmployee(
  user: AppUser | null,
  companyId: string,
  employeeId?: string
) {
  if (!employeeId) return false;

  return canApproveAbsence(user, {
    companyId,
    employeeId,
  });
}

export default function AbsenceManager({ companyId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);

  const [formData, setFormData] = useState({
    employeeId: "",
    absenceType: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setUser(null);
        return;
      }

      const data = userSnap.data();

      setUser({
        uid: firebaseUser.uid,
        email: data.email,
        role: data.role,
        companyId: data.companyId,
        employeeId: data.employeeId,
        accessScope: data.accessScope ?? "company",
        teamEmployeeIds: data.teamEmployeeIds ?? [],
      });
    });

    return () => unsubscribe();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const employeesSnap = await getDocs(
        collection(db, "companies", companyId, "employees")
      );

      const employeeData = employeesSnap.docs.map((employeeDoc) => ({
        id: employeeDoc.id,
        ...employeeDoc.data(),
      })) as Employee[];

      const absencesSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "absences"),
          orderBy("createdAt", "desc")
        )
      );

      const absenceData = absencesSnap.docs.map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      })) as Absence[];

      setEmployees(employeeData);
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
  }, [companyId]);

  function updateField(key: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function updateStatus(absence: Absence, status: AbsenceStatus) {
    if (!canApproveForEmployee(user, companyId, absence.employeeId)) {
      alert("Keine Berechtigung");
      return;
    }

    await updateDoc(doc(db, "companies", companyId, "absences", absence.id), {
      status,
      updatedAt: new Date().toISOString(),
    });

    await loadData();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const employee = employees.find((item) => item.id === formData.employeeId);

    if (!employee) {
      setMessage("Bitte Mitarbeiter auswählen.");
      return;
    }

    if (!formData.absenceType || !formData.startDate || !formData.endDate) {
      setMessage("Bitte Fehlzeitart und Zeitraum vollständig ausfüllen.");
      return;
    }

    if (!canApproveForEmployee(user, companyId, employee.id)) {
      setMessage("Keine Berechtigung zum Anlegen dieser Fehlzeit.");
      return;
    }

    const absenceType = getAbsenceType(formData.absenceType);

    await addDoc(collection(db, "companies", companyId, "absences"), {
      ...formData,
      employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
      employeeEmail: employee.email || "",
      absenceLabel: absenceType?.label || "",
      requiresDocument: absenceType?.requiresDocument ?? false,
      payrollRelevant: absenceType?.payrollRelevant ?? true,
      status: "requested",
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    setFormData({
      employeeId: "",
      absenceType: "",
      startDate: "",
      endDate: "",
      notes: "",
    });

    setMessage("Fehlzeit gespeichert ✅");
    await loadData();
  }

  const canCreateAbsence =
    user?.role === "northwind_admin" ||
    user?.role === "client_admin" ||
    user?.role === "client_hr_admin" ||
    user?.role === "team_lead";

  if (loading) {
    return <p>Lade Fehlzeiten...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fehlzeiten</h1>
        <p className="text-gray-600">
          Abwesenheiten erfassen, payroll-relevant prüfen und genehmigen.
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      {canCreateAbsence && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl bg-white p-6 shadow"
        >
          <h2 className="text-xl font-semibold">Neue Abwesenheit erfassen</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mitarbeiter">
              <select
                className={inputClass}
                value={formData.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
                required
              >
                <option value="">Bitte wählen</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Art der Abwesenheit">
              <select
                className={inputClass}
                value={formData.absenceType}
                onChange={(e) => updateField("absenceType", e.target.value)}
                required
              >
                <option value="">Bitte wählen</option>
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

          {formData.absenceType && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Payroll-Hinweis</p>
              <p className="mt-1">
                {getAbsenceType(formData.absenceType)?.requiresDocument
                  ? "Für diese Abwesenheit sollte ein Nachweis/Dokument vorliegen."
                  : "Für diese Abwesenheit ist standardmäßig kein Dokument erforderlich."}
              </p>
            </div>
          )}

          <FormField label="Hinweise">
            <textarea
              className="min-h-24 w-full rounded border p-3"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
            />
          </FormField>

          <button className="rounded bg-blue-900 px-4 py-2 text-white">
            Speichern
          </button>
        </form>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Übersicht</h2>

        {absences.length === 0 ? (
          <p className="text-gray-600">Keine Abwesenheiten vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {absences.map((absence) => (
              <div key={absence.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium">
                      {absence.employeeName || "Unbekannter Mitarbeiter"}
                    </p>

                    <p className="text-sm text-gray-600">
                      {absence.absenceLabel ||
                        getAbsenceLabel(absence.absenceType)}{" "}
                      vom {absence.startDate || "-"} bis{" "}
                      {absence.endDate || "-"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {absence.payrollRelevant && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                          Payroll-relevant
                        </span>
                      )}

                      {absence.requiresDocument && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
                          Nachweis erforderlich
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

                {absence.status === "requested" &&
                  canApproveForEmployee(user, companyId, absence.employeeId) && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(absence, "approved")}
                        className="rounded bg-green-600 px-3 py-2 text-sm text-white"
                      >
                        Genehmigen
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStatus(absence, "rejected")}
                        className="rounded bg-red-600 px-3 py-2 text-sm text-white"
                      >
                        Ablehnen
                      </button>
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}