"use client";

import { useEffect, useMemo, useState } from "react";
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
import { auth, db } from "@/lib/firebase";
import FormField from "@/components/FormField";
import { canApproveAbsence, type AppUser } from "@/lib/auth/roles";

type Props = {
  companyId: string;
};

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
};

type AbsenceStatus = "requested" | "approved" | "rejected";

type Absence = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;

  managerId?: string;
  managerName?: string;
  managerEmail?: string;

  absenceType?: string;
  absenceLabel?: string;
  startDate?: string;
  endDate?: string;
  status?: AbsenceStatus;
  notes?: string;

  halfDay?: boolean;
  substitutePerson?: string;

  hospitalStay?: boolean;
  requiresEAU?: boolean;
  eAUStatus?: string;
  eauUploaded?: boolean;

  childName?: string;
  childBirthDate?: string;
  singleParent?: boolean;

  parentalLeavePartTime?: boolean;

  bgRelevant?: boolean;
  payrollRelevant?: boolean;
  requiresDocument?: boolean;

  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
};

const inputClass = "w-full rounded-xl border p-3 disabled:bg-gray-100";

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
    requiresDocument: false,
    payrollRelevant: true,
  },
  {
    value: "child_sickness",
    label: "Kind krank",
    requiresDocument: true,
    payrollRelevant: true,
  },
  {
    value: "work_accident",
    label: "Arbeitsunfall",
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

function getEmployeeName(employee?: Employee) {
  return `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim();
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
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [user, setUser] = useState<AppUser | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | AbsenceStatus>(
    "requested"
  );

  const [formData, setFormData] = useState({
    employeeId: "",
    absenceType: "",
    startDate: "",
    endDate: "",
    notes: "",

    halfDay: false,
    substitutePerson: "",

    hospitalStay: false,
    eauUploaded: false,

    childName: "",
    childBirthDate: "",
    singleParent: false,

    parentalLeavePartTime: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

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

  function updateField(
    key: keyof typeof formData,
    value: string | boolean
  ) {
    setFormData((prev) => ({
      ...prev,
      [key]: value as never,
    }));
  }

  function resetForm() {
    setFormData({
      employeeId: "",
      absenceType: "",
      startDate: "",
      endDate: "",
      notes: "",

      halfDay: false,
      substitutePerson: "",

      hospitalStay: false,
      eauUploaded: false,

      childName: "",
      childBirthDate: "",
      singleParent: false,

      parentalLeavePartTime: false,
    });
  }

  async function updateStatus(absence: Absence, status: AbsenceStatus) {
    if (!canApproveForEmployee(user, companyId, absence.employeeId)) {
      setMessage("Keine Berechtigung für diese Aktion.");
      return;
    }

    const now = new Date().toISOString();

    try {
      await updateDoc(doc(db, "companies", companyId, "absences", absence.id), {
        status,
        updatedAt: now,
        ...(status === "approved"
          ? {
              approvedAt: now,
              approvedBy: user?.uid || "",
            }
          : {
              rejectedAt: now,
              rejectedBy: user?.uid || "",
            }),
      });

      setMessage(
        status === "approved"
          ? "Fehlzeit wurde genehmigt ✅"
          : "Fehlzeit wurde abgelehnt."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Status konnte nicht geändert werden: ${error.message}`);
    }
  }

  async function updateEAU(absence: Absence, eauUploaded: boolean) {
    try {
      await updateDoc(doc(db, "companies", companyId, "absences", absence.id), {
        eauUploaded,
        eAUStatus: eauUploaded ? "received" : "to_be_requested",
        updatedAt: new Date().toISOString(),
      });

      setMessage(
        eauUploaded
          ? "eAU wurde als vorhanden markiert ✅"
          : "eAU wurde wieder auf offen gesetzt."
      );

      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`eAU-Status konnte nicht geändert werden: ${error.message}`);
    }
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

    if (formData.endDate < formData.startDate) {
      setMessage("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }

    if (
      formData.absenceType === "child_sickness" &&
      (!formData.childName || !formData.childBirthDate)
    ) {
      setMessage("Bitte Name und Geburtsdatum des Kindes erfassen.");
      return;
    }

    if (!canApproveForEmployee(user, companyId, employee.id)) {
      setMessage("Keine Berechtigung zum Anlegen dieser Fehlzeit.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const absenceType = getAbsenceType(formData.absenceType);
      const requiresEAU = formData.absenceType === "sickness_with_certificate";
      const bgRelevant = formData.absenceType === "work_accident";

      await addDoc(collection(db, "companies", companyId, "absences"), {
        employeeId: formData.employeeId,
        employeeName: getEmployeeName(employee),
        employeeEmail: employee.email || "",

        managerId: employee.managerId || "",
        managerName: employee.managerName || "",
        managerEmail: employee.managerEmail || "",

        absenceType: formData.absenceType,
        absenceLabel: absenceType?.label || "",
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes,

        halfDay: formData.halfDay,
        substitutePerson: formData.substitutePerson,

        hospitalStay: formData.hospitalStay,
        requiresEAU,
        eAUStatus: requiresEAU
          ? formData.eauUploaded
            ? "received"
            : "to_be_requested"
          : "not_required",
        eauUploaded: requiresEAU ? formData.eauUploaded : false,

        childName: formData.childName,
        childBirthDate: formData.childBirthDate,
        singleParent: formData.singleParent,

        parentalLeavePartTime: formData.parentalLeavePartTime,

        bgRelevant,
        payrollRelevant: absenceType?.payrollRelevant ?? true,
        requiresDocument: absenceType?.requiresDocument ?? false,

        approvalRequired: true,
        approvalLevel: 1,
        status: "requested",

        createdBy: user?.uid || "",
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      resetForm();
      setMessage("Fehlzeit gespeichert ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehlzeit konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const canCreateAbsence =
    user?.role === "northwind_admin" ||
    user?.role === "client_admin" ||
    user?.role === "client_hr_admin" ||
    user?.role === "team_lead";

  const filteredAbsences = useMemo(() => {
    if (statusFilter === "all") return absences;
    return absences.filter((absence) => absence.status === statusFilter);
  }, [absences, statusFilter]);

  const requestedCount = absences.filter(
    (absence) => absence.status === "requested"
  ).length;

  const approvedCount = absences.filter(
    (absence) => absence.status === "approved"
  ).length;

  const rejectedCount = absences.filter(
    (absence) => absence.status === "rejected"
  ).length;

  const eAUOpenCount = absences.filter(
    (absence) => absence.requiresEAU && !absence.eauUploaded
  ).length;

  const bgRelevantCount = absences.filter(
    (absence) => absence.bgRelevant
  ).length;

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow">
        Lade Fehlzeiten...
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fehlzeiten</h1>

          <p className="text-gray-600">
            Abwesenheiten erfassen, prüfen und genehmigen.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-sm md:grid-cols-5">
          <SummaryCard label="Beantragt" value={requestedCount} color="yellow" />
          <SummaryCard label="Genehmigt" value={approvedCount} color="green" />
          <SummaryCard label="Abgelehnt" value={rejectedCount} color="red" />
          <SummaryCard label="eAU offen" value={eAUOpenCount} color="purple" />
          <SummaryCard label="BG" value={bgRelevantCount} color="red" />
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      {canCreateAbsence && (
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl bg-white p-6 shadow"
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
                    {getEmployeeName(employee)}
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

          {formData.employeeId && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              {(() => {
                const employee = employees.find(
                  (item) => item.id === formData.employeeId
                );

                return employee?.managerName ? (
                  <p>
                    Vorgesetzter:{" "}
                    <span className="font-medium">{employee.managerName}</span>
                    {employee.managerEmail ? ` · ${employee.managerEmail}` : ""}
                  </p>
                ) : (
                  <p className="text-orange-700">
                    Für diesen Mitarbeiter ist noch kein Vorgesetzter
                    hinterlegt.
                  </p>
                );
              })()}
            </div>
          )}

          {formData.absenceType === "vacation" && (
            <DetailBox title="Urlaubsdetails">
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
                  onChange={(e) =>
                    updateField("substitutePerson", e.target.value)
                  }
                  placeholder="Optional"
                />
              </FormField>
            </DetailBox>
          )}

          {(formData.absenceType === "sickness_with_certificate" ||
            formData.absenceType === "sickness_without_certificate") && (
            <DetailBox title="Krankheitsdetails" tone="blue">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.hospitalStay}
                  onChange={(e) => updateField("hospitalStay", e.target.checked)}
                />
                Krankenhausaufenthalt / Sondernachweis
              </label>

              {formData.absenceType === "sickness_with_certificate" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.eauUploaded}
                    onChange={(e) =>
                      updateField("eauUploaded", e.target.checked)
                    }
                  />
                  eAU liegt bereits vor
                </label>
              )}

              {formData.absenceType === "sickness_with_certificate" && (
                <p className="rounded-lg bg-white p-3 text-sm text-blue-900">
                  Die eAU wird durch Payroll bzw. Arbeitgeber abgerufen. Dieser
                  Status fließt in die Payroll Readiness ein.
                </p>
              )}
            </DetailBox>
          )}

          {formData.absenceType === "child_sickness" && (
            <DetailBox title="Angaben zum Kind" tone="pink">
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
                  onChange={(e) =>
                    updateField("childBirthDate", e.target.value)
                  }
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
            </DetailBox>
          )}

          {formData.absenceType === "work_accident" && (
            <DetailBox title="Arbeitsunfall" tone="red">
              <p className="rounded-lg bg-white p-3 text-sm text-red-900">
                Diese Abwesenheit ist BG-relevant und muss ggf. an die
                Berufsgenossenschaft gemeldet werden.
              </p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.hospitalStay}
                  onChange={(e) => updateField("hospitalStay", e.target.checked)}
                />
                Krankenhausaufenthalt
              </label>
            </DetailBox>
          )}

          {formData.absenceType === "parental_leave" && (
            <DetailBox title="Elternzeit">
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
            </DetailBox>
          )}

          {formData.absenceType && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-medium">Payroll-Hinweis</p>

              <p className="mt-1">
                {formData.absenceType === "sickness_with_certificate"
                  ? "Die eAU wird durch Payroll / Arbeitgeber abgerufen."
                  : getAbsenceType(formData.absenceType)?.requiresDocument
                    ? "Für diese Abwesenheit kann ein Nachweis oder eine gesonderte Prüfung erforderlich sein."
                    : "Für diese Abwesenheit ist standardmäßig kein Dokument erforderlich."}
              </p>
            </div>
          )}

          <FormField label="Hinweise">
            <textarea
              className="min-h-24 w-full rounded-xl border p-3"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional: Hinweise zur Fehlzeit"
            />
          </FormField>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Fehlzeit speichern"}
          </button>
        </form>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Übersicht</h2>

          <div className="flex flex-wrap gap-2">
            {[
              ["requested", "Beantragt"],
              ["approved", "Genehmigt"],
              ["rejected", "Abgelehnt"],
              ["all", "Alle"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value as "all" | AbsenceStatus)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  statusFilter === value
                    ? "bg-blue-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredAbsences.length === 0 ? (
          <p className="text-gray-600">
            Keine passenden Abwesenheiten vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredAbsences.map((absence) => (
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

                    {absence.managerName && (
                      <p className="mt-1 text-sm text-gray-500">
                        Vorgesetzter: {absence.managerName}
                        {absence.managerEmail
                          ? ` · ${absence.managerEmail}`
                          : ""}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {absence.payrollRelevant && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                          Payroll-relevant
                        </span>
                      )}

                      {absence.requiresEAU && (
                        <button
                          type="button"
                          onClick={() =>
                            updateEAU(absence, !absence.eauUploaded)
                          }
                          className={`rounded-full px-3 py-1 ${
                            absence.eauUploaded
                              ? "bg-green-100 text-green-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {absence.eauUploaded
                            ? "eAU vorhanden"
                            : "eAU offen"}
                        </button>
                      )}

                      {absence.bgRelevant && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
                          BG-relevant
                        </span>
                      )}

                      {absence.requiresDocument && (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
                          Nachweis / Prüfung erforderlich
                        </span>
                      )}

                      {absence.childName && (
                        <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-800">
                          Kind: {absence.childName}
                        </span>
                      )}

                      {absence.hospitalStay && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          Krankenhaus / Sondernachweis
                        </span>
                      )}

                      {absence.halfDay && (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                          Halber Tag
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
                    className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                      absence.status
                    )}`}
                  >
                    {getStatusLabel(absence.status)}
                  </span>
                </div>

                {absence.status === "requested" &&
                  canApproveForEmployee(user, companyId, absence.employeeId) && (
                    <div className="mt-4 flex flex-wrap gap-2">
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

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "yellow" | "green" | "red" | "purple";
}) {
  const classes = {
    yellow: "bg-yellow-50 text-yellow-800",
    green: "bg-green-50 text-green-800",
    red: "bg-red-50 text-red-800",
    purple: "bg-purple-50 text-purple-800",
  };

  return (
    <div className={`rounded-xl px-4 py-3 ${classes[color]}`}>
      <p className="text-xs">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function DetailBox({
  title,
  tone = "gray",
  children,
}: {
  title: string;
  tone?: "gray" | "blue" | "pink" | "red";
  children: React.ReactNode;
}) {
  const classes = {
    gray: "border-gray-200 bg-gray-50 text-gray-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    pink: "border-pink-200 bg-pink-50 text-pink-900",
    red: "border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div className={`space-y-4 rounded-xl border p-4 ${classes[tone]}`}>
      <h4 className="font-medium">{title}</h4>
      {children}
    </div>
  );
}