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
  [key: string]: unknown;
};

type DocumentData = {
  documentType?: string;
  [key: string]: unknown;
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
    () =>
      employee
        ? checkEmployeeReadiness(employee)
        : { ready: false, missing: [] as string[] },
    [employee]
  );

  const documentCheck = useMemo(
    () =>
      employee
        ? checkDocuments(employee, documents)
        : { ready: false, missing: [] as string[] },
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
    employeeCheck.missing.length +
    documentCheck.missing.length +
    completedItems.length;

  const progress =
    totalRequired === 0
      ? 100
      : Math.round((completedItems.length / totalRequired) * 100);

  async function handleAbsenceSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!employee) return;

    if (
      !absenceForm.absenceType ||
      !absenceForm.startDate ||
      !absenceForm.endDate
    ) {
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
        employeeName: `${employee.firstName || ""} ${
          employee.lastName || ""
        }`.trim(),
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
        status: "requested",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setAbsenceForm({
        absenceType: "vacation",
        startDate: "",
        endDate: "",
        notes: "",
      });

      setMessage("Abwesenheit wurde eingereicht.");

      const user = auth.currentUser;
      if (user) {
        await loadEmployeeData(user.uid);
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
    window.location.href = "/employee/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Self Service...
        </section>
      </main>
    );
  }

  if (!allowed || !employee) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Kein Zugriff</h1>
          <p className="mt-2 text-gray-600">
            Du hast keinen Zugriff auf diesen Self-Service-Bereich.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Abmelden
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Employee Self Service
          </p>

          <h1 className="text-3xl font-bold">
            Hallo {employee.firstName || ""} {employee.lastName || ""}
          </h1>

          <p className="mt-1 text-gray-600">
            Hier kannst du deine Daten prüfen, Dokumente einreichen, Zeiten
            erfassen und Abwesenheiten melden.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
        >
          Abmelden
        </button>
      </header>

      {message && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Payroll Readiness</p>
          <p className="mt-2 text-3xl font-bold">{progress}%</p>

          <div className="mt-4 h-3 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-900"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Offene Stammdaten</p>
          <p className="mt-2 text-3xl font-bold">
            {employeeCheck.missing.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Dokumentenprüfung</p>
          <p className="mt-2 text-3xl font-bold">
            {documentCheck.missing.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Abwesenheiten</p>
          <p className="mt-2 text-3xl font-bold">{absences.length}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href={`/employee/self-service/${companyId}/${employeeId}/documents`}
          className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
        >
          <p className="text-sm font-medium text-blue-900">Dokumentencenter</p>
          <h2 className="mt-2 text-xl font-semibold">Meine Dokumente</h2>
          <p className="mt-1 text-sm text-gray-600">
            Krankmeldungen, Kind-krank-Nachweise, Payroll-Dokumente und Dateien
            hochladen oder abrufen.
          </p>
          <div className="mt-4 inline-block rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900">
            Öffnen
          </div>
        </Link>

        <Link
          href={`/employee/self-service/${companyId}/${employeeId}/time`}
          className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
        >
          <p className="text-sm font-medium text-blue-900">Zeiterfassung</p>
          <h2 className="mt-2 text-xl font-semibold">Meine Zeiten</h2>
          <p className="mt-1 text-sm text-gray-600">
            Arbeitszeiten, Pausen, Überstunden und Hinweise für den aktuellen
            Payroll-Monat erfassen.
          </p>
          <div className="mt-4 inline-block rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900">
            Öffnen
          </div>
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-blue-900">Status</p>
          <h2 className="mt-2 text-xl font-semibold">Offene Punkte</h2>

          {employeeCheck.missing.length === 0 &&
          documentCheck.missing.length === 0 ? (
            <p className="mt-2 text-sm text-green-700">
              Deine Payroll-Daten wirken vollständig.
            </p>
          ) : (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
              {[...employeeCheck.missing, ...documentCheck.missing].map(
                (item) => (
                  <li key={item}>{item}</li>
                )
              )}
            </ul>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm font-medium text-blue-900">Kontakt</p>
          <h2 className="mt-2 text-xl font-semibold">Payroll Rückfragen</h2>
          <p className="mt-1 text-sm text-gray-600">
            Bei Fragen zu deinen Daten oder Dokumenten wende dich bitte an dein
            HR-/Payroll-Team.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Meine Stammdaten</h2>

          <p className="mt-1 text-sm text-gray-600">
            Prüfe deine persönlichen Angaben für Payroll und HR.
          </p>

          <div className="mt-5">
            <EmployeeSelfServiceForm
              companyId={companyId}
              employeeId={employeeId}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">
            Dokumente aus der Personalakte
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Bestehende Dokumente aus deinem Mitarbeiterprofil.
          </p>

          <div className="mt-5">
            <EmployeeDocuments companyId={companyId} employeeId={employeeId} />
          </div>
        </section>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Abwesenheit beantragen</h2>

        <form onSubmit={handleAbsenceSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Art der Abwesenheit
              </label>

              <select
                value={absenceForm.absenceType}
                onChange={(event) =>
                  setAbsenceForm((previous) => ({
                    ...previous,
                    absenceType: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {absenceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Von
              </label>

              <input
                type="date"
                value={absenceForm.startDate}
                onChange={(event) =>
                  setAbsenceForm((previous) => ({
                    ...previous,
                    startDate: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bis
              </label>

              <input
                type="date"
                value={absenceForm.endDate}
                onChange={(event) =>
                  setAbsenceForm((previous) => ({
                    ...previous,
                    endDate: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hinweis
            </label>

            <textarea
              value={absenceForm.notes}
              onChange={(event) =>
                setAbsenceForm((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
              rows={4}
              placeholder="Optionaler Hinweis an HR/Payroll"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={savingAbsence}
            className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {savingAbsence ? "Speichert..." : "Abwesenheit einreichen"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Meine Abwesenheiten</h2>

        {absences.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Abwesenheiten vorhanden.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Art</th>
                  <th className="p-3 font-semibold">Von</th>
                  <th className="p-3 font-semibold">Bis</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Hinweis</th>
                </tr>
              </thead>

              <tbody>
                {absences.map((absence) => (
                  <tr key={absence.id} className="border-t align-top">
                    <td className="p-3 font-medium">
                      {absence.absenceLabel ||
                        getAbsenceLabel(absence.absenceType)}
                    </td>

                    <td className="p-3">{absence.startDate || "-"}</td>

                    <td className="p-3">{absence.endDate || "-"}</td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          absence.status
                        )}`}
                      >
                        {getStatusLabel(absence.status)}
                      </span>
                    </td>

                    <td className="p-3">{absence.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}