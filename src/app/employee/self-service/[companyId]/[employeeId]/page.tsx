"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

import EmployeeSelfServiceForm from "@/components/EmployeeSelfServiceForm";
import EmployeeDocuments from "@/components/EmployeeDocuments";
import {
  checkEmployeeReadiness,
  checkDocuments,
} from "@/lib/payrollReadiness";

type EmployeeData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  authUid?: string;
  userId?: string;
  taxId?: string;
  socialSecurityNumber?: string;
  healthInsurance?: string;
  iban?: string;
  [key: string]: any;
};

type DocumentData = {
  documentType?: string;
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

const inputClass = "w-full rounded-xl border p-3";

const absenceTypes = [
  { value: "vacation", label: "Urlaub" },
  { value: "sickness_without_certificate", label: "Krankheit ohne Attest" },
  { value: "sickness_with_certificate", label: "Krankheit mit Attest / eAU" },
  { value: "child_sickness", label: "Kind krank" },
  { value: "special_leave", label: "Sonderurlaub" },
  { value: "unpaid_leave", label: "Unbezahlte Freistellung" },
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

export default function EmployeeSelfServicePage({
  params,
}: {
  params: Promise<{ companyId: string; employeeId: string }>;
}) {
  const { companyId, employeeId } = use(params);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [message, setMessage] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  const [absenceForm, setAbsenceForm] = useState({
    absenceType: "vacation",
    startDate: "",
    endDate: "",
    notes: "",
  });

  async function loadEmployeeData(currentUid: string) {
    const employeeRef = doc(db, "companies", companyId, "employees", employeeId);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const employeeData = employeeSnap.data() as EmployeeData;

    if (employeeData.authUid !== currentUid && employeeData.userId !== currentUid) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const documentsSnap = await getDocs(
      collection(db, "companies", companyId, "employees", employeeId, "documents")
    );

    const documentData = documentsSnap.docs.map((documentDoc) =>
      documentDoc.data()
    ) as DocumentData[];

    const absencesSnap = await getDocs(
      query(
        collection(db, "companies", companyId, "absences"),
        orderBy("createdAt", "desc")
      )
    );

    const absenceData = absencesSnap.docs
      .map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      }))
      .filter((absence: any) => absence.employeeId === employeeId) as Absence[];

    setEmployee(employeeData);
    setDocuments(documentData);
    setAbsences(absenceData);
    setAllowed(true);
    setLoading(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          window.location.href = "/employee/login";
          return;
        }

        await loadEmployeeData(user.uid);
      } catch (error: any) {
        console.error(error);
        setMessage(`Daten konnten nicht geladen werden: ${error.message}`);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [companyId, employeeId]);

  const employeeCheck = useMemo(
    () => (employee ? checkEmployeeReadiness(employee) : { ready: false, missing: [] }),
    [employee]
  );

  const documentCheck = useMemo(
    () => (employee ? checkDocuments(employee, documents) : { ready: false, missing: [] }),
    [employee, documents]
  );

  const completedItems = useMemo(() => {
    if (!employee) return [];

    return [
      employee.firstName && employee.lastName ? "Persönliche Daten" : null,
      employee.taxId ? "Steuer-ID" : null,
      employee.socialSecurityNumber ? "Sozialversicherungsnummer" : null,
      employee.healthInsurance ? "Krankenkasse" : null,
      employee.iban ? "Bankverbindung" : null,
    ].filter(Boolean);
  }, [employee]);

  const totalRequired =
    employeeCheck.missing.length + documentCheck.missing.length + completedItems.length;

  const progress =
    totalRequired === 0
      ? 100
      : Math.round((completedItems.length / totalRequired) * 100);

  async function handleAbsenceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!employee) return;

    if (!absenceForm.absenceType || !absenceForm.startDate || !absenceForm.endDate) {
      setMessage("Bitte Art und Zeitraum der Abwesenheit ausfüllen.");
      return;
    }

    if (absenceForm.endDate < absenceForm.startDate) {
      setMessage("Das Enddatum darf nicht vor dem Startdatum liegen.");
      return;
    }

    setSavingAbsence(true);
    setMessage("");

    try {
      const selectedType = absenceTypes.find(
        (type) => type.value === absenceForm.absenceType
      );

      await addDoc(collection(db, "companies", companyId, "absences"), {
        employeeId,
        employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
        employeeEmail: employee.email || "",

        absenceType: absenceForm.absenceType,
        absenceLabel: selectedType?.label || "",
        startDate: absenceForm.startDate,
        endDate: absenceForm.endDate,
        notes: absenceForm.notes,

        requiresEAU: absenceForm.absenceType === "sickness_with_certificate",
        eauUploaded: false,
        eAUStatus:
          absenceForm.absenceType === "sickness_with_certificate"
            ? "to_be_requested"
            : "not_required",

        payrollRelevant: true,
        requiresDocument:
          absenceForm.absenceType === "child_sickness" ||
          absenceForm.absenceType === "unpaid_leave",

        approvalRequired: true,
        approvalLevel: 1,
        status: "requested",

        createdBy: employee.authUid || employee.userId || "",
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      setAbsenceForm({
        absenceType: "vacation",
        startDate: "",
        endDate: "",
        notes: "",
      });

      setMessage("Abwesenheit wurde beantragt ✅");

      const currentUser = auth.currentUser;
      if (currentUser) {
        await loadEmployeeData(currentUser.uid);
      }
    } catch (error: any) {
      console.error(error);
      setMessage(`Abwesenheit konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSavingAbsence(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  }

  if (loading) {
    return <p className="p-6">Prüfe Zugriff...</p>;
  }

  if (!allowed || !employee) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow">
          <p className="text-red-700">
            Zugriff verweigert. Sie dürfen diese Daten nicht einsehen.
          </p>
          <Link href="/login" className="mt-4 inline-block text-blue-900 underline">
            Zur Login-Auswahl
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Employee Self Service</h1>
            <p className="text-gray-600">
              Willkommen, {employee.firstName || ""} {employee.lastName || ""}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-200"
          >
            Logout
          </button>
        </div>

        {message && (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <StatusCard
            title="Onboarding"
            value={employeeCheck.ready && documentCheck.ready ? "Vollständig" : "Offen"}
            tone={employeeCheck.ready && documentCheck.ready ? "green" : "yellow"}
          />

          <StatusCard
            title="Fortschritt"
            value={`${progress}%`}
            tone="blue"
          />

          <StatusCard
            title="Dokumente"
            value={String(documents.length)}
            tone="gray"
          />

          <StatusCard
            title="Abwesenheiten"
            value={String(absences.length)}
            tone="gray"
          />
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Ihr Onboarding-Status</h2>
              <p className="text-sm text-gray-600">
                Hier sehen Sie, welche Angaben oder Dokumente noch fehlen.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                employeeCheck.ready && documentCheck.ready
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {employeeCheck.ready && documentCheck.ready
                ? "Vollständig"
                : "Unvollständig"}
            </span>
          </div>

          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Fortschritt</span>
              <span>{progress}%</span>
            </div>

            <div className="h-3 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-900"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock
              title="Fehlende Angaben"
              emptyText="Alle erforderlichen Angaben sind vorhanden ✅"
              items={employeeCheck.missing}
            />

            <InfoBlock
              title="Fehlende Dokumente"
              emptyText="Alle erforderlichen Dokumente sind vorhanden ✅"
              items={documentCheck.missing}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleAbsenceSubmit}
            className="space-y-4 rounded-2xl bg-white p-6 shadow"
          >
            <div>
              <h2 className="text-xl font-semibold">Abwesenheit beantragen</h2>
              <p className="text-sm text-gray-600">
                Urlaub, Krankheit oder sonstige Abwesenheit einreichen.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Art der Abwesenheit">
                <select
                  className={inputClass}
                  value={absenceForm.absenceType}
                  onChange={(e) =>
                    setAbsenceForm((prev) => ({
                      ...prev,
                      absenceType: e.target.value,
                    }))
                  }
                >
                  {absenceTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Von">
                <input
                  type="date"
                  className={inputClass}
                  value={absenceForm.startDate}
                  onChange={(e) =>
                    setAbsenceForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="Bis">
                <input
                  type="date"
                  className={inputClass}
                  value={absenceForm.endDate}
                  onChange={(e) =>
                    setAbsenceForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  required
                />
              </Field>
            </div>

            <Field label="Hinweise">
              <textarea
                className="min-h-24 w-full rounded-xl border p-3"
                value={absenceForm.notes}
                onChange={(e) =>
                  setAbsenceForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </Field>

            <button
              type="submit"
              disabled={savingAbsence}
              className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {savingAbsence ? "Sendet..." : "Abwesenheit beantragen"}
            </button>
          </form>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div>
              <h2 className="text-xl font-semibold">Meine Abwesenheiten</h2>
              <p className="text-sm text-gray-600">
                Status Ihrer eingereichten Abwesenheiten.
              </p>
            </div>

            {absences.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
                Noch keine Abwesenheiten vorhanden.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {absences.slice(0, 6).map((absence) => (
                  <div key={absence.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {absence.absenceLabel ||
                            getAbsenceLabel(absence.absenceType)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {absence.startDate} bis {absence.endDate}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          absence.status
                        )}`}
                      >
                        {getStatusLabel(absence.status)}
                      </span>
                    </div>

                    {absence.notes && (
                      <p className="mt-2 text-sm text-gray-700">
                        {absence.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <EmployeeSelfServiceForm companyId={companyId} employeeId={employeeId} />

        <EmployeeDocuments companyId={companyId} employeeId={employeeId} />
      </div>
    </main>
  );
}

function StatusCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "yellow" | "blue" | "gray";
}) {
  const classes = {
    green: "bg-green-50 text-green-900",
    yellow: "bg-yellow-50 text-yellow-900",
    blue: "bg-blue-50 text-blue-900",
    gray: "bg-white text-gray-900",
  };

  return (
    <div className={`rounded-2xl p-5 shadow ${classes[tone]}`}>
      <p className="text-sm opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoBlock({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-2 font-semibold">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-green-700">{emptyText}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-800">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}