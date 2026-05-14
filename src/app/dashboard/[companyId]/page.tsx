"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  checkEmployeeReadiness,
  checkDocuments,
} from "@/lib/payrollReadiness";

type CompanyData = {
  companyName?: string;
  email?: string;
  taxNumber?: string;
  companyNumber?: string;
  bgCompanyNumber?: string;
  bgPin?: string;
};

type EmployeeDashboardItem = {
  id: string;
  firstName: string;
  lastName: string;
  ready: boolean;
  missing: string[];
};

type Absence = {
  id: string;
  employeeName?: string;
  absenceType?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

function getAbsenceLabel(value?: string) {
  if (value === "vacation") return "Urlaub";
  if (value === "sickness") return "Krankheit";
  if (value === "sickness_without_certificate") return "Krankheit ohne Attest";
  if (value === "sickness_with_certificate") return "Krankheit mit Attest / eAU";
  if (value === "child_sickness") return "Kind krank";
  if (value === "work_accident") return "Arbeitsunfall";
  if (value === "unpaid_leave") return "Unbezahlte Freistellung";
  if (value === "maternity_leave") return "Mutterschutz";
  if (value === "maternity_protection") return "Mutterschutz";
  if (value === "parental_leave") return "Elternzeit";
  if (value === "special_leave") return "Sonderurlaub";
  if (value === "care_leave") return "Pflegezeit";
  if (value === "time_off_in_lieu") return "Freizeitausgleich";
  return "Sonstige Fehlzeit";
}

function getMissingCompanyFields(company: CompanyData) {
  const missingCompanyFields: string[] = [];

  if (!company.companyName) missingCompanyFields.push("Firmenname");
  if (!company.email) missingCompanyFields.push("E-Mail");
  if (!company.taxNumber) missingCompanyFields.push("Steuernummer");
  if (!company.companyNumber) missingCompanyFields.push("Betriebsnummer");
  if (!company.bgCompanyNumber) missingCompanyFields.push("BG-Unternehmensnummer");
  if (!company.bgPin) missingCompanyFields.push("BG PIN");

  return missingCompanyFields;
}

export default function CompanyDashboardPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const [company, setCompany] = useState<CompanyData>({});
  const [employees, setEmployees] = useState<EmployeeDashboardItem[]>([]);
  const [openAbsences, setOpenAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboardData() {
    setLoading(true);
    setMessage("");

    try {
      const companySnap = await getDoc(doc(db, "companies", companyId));
      const companyData = companySnap.exists()
        ? (companySnap.data() as CompanyData)
        : {};

      const employeesSnap = await getDocs(
        collection(db, "companies", companyId, "employees")
      );

      const employeeItems = await Promise.all(
        employeesSnap.docs.map(async (employeeDoc) => {
          const employeeData = employeeDoc.data();

          let documents: any[] = [];

          try {
            const documentsSnap = await getDocs(
              collection(
                db,
                "companies",
                companyId,
                "employees",
                employeeDoc.id,
                "documents"
              )
            );

            documents = documentsSnap.docs.map((documentDoc) =>
              documentDoc.data()
            );
          } catch {
            documents = [];
          }

          const employeeCheck = checkEmployeeReadiness(employeeData);
          const documentCheck = checkDocuments(employeeData, documents);

          return {
            id: employeeDoc.id,
            firstName: employeeData.firstName || "",
            lastName: employeeData.lastName || "",
            ready: employeeCheck.ready && documentCheck.ready,
            missing: [...employeeCheck.missing, ...documentCheck.missing],
          };
        })
      );

      const absencesSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "absences"),
          where("status", "==", "requested")
        )
      );

      const absenceData = absencesSnap.docs.map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      })) as Absence[];

      setCompany(companyData);
      setEmployees(employeeItems);
      setOpenAbsences(absenceData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Dashboard konnte nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [companyId]);

  const missingCompanyFields = useMemo(
    () => getMissingCompanyFields(company),
    [company]
  );

  const totalEmployees = employees.length;
  const readyEmployees = employees.filter((employee) => employee.ready);
  const notReadyEmployees = employees.filter((employee) => !employee.ready);

  const payrollReady =
    missingCompanyFields.length === 0 &&
    totalEmployees > 0 &&
    notReadyEmployees.length === 0;

  const progress =
    totalEmployees === 0
      ? 0
      : Math.round((readyEmployees.length / totalEmployees) * 100);

  const totalOpenTasks =
    missingCompanyFields.length + notReadyEmployees.length + openAbsences.length;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Dashboard...
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600">
            Überblick über offene Aufgaben, Mitarbeiterdaten und Lohnabrechnung.
          </p>
        </div>

        <Link
          href={`/dashboard/${companyId}/employees`}
          className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Mitarbeiter hinzufügen
        </Link>
      </div>

      {message && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {message}
        </p>
      )}

      {missingCompanyFields.length > 0 && (
        <section className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5">
          <p className="font-medium text-yellow-800">
            Ihr Unternehmen ist noch nicht vollständig eingerichtet
          </p>

          <p className="mt-1 text-sm text-yellow-700">
            Ohne diese Angaben kann keine Lohnabrechnung erstellt werden.
          </p>

          <ul className="mt-2 list-disc pl-5 text-sm text-yellow-700">
            {missingCompanyFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>

          <Link
            href={`/dashboard/${companyId}/company-data`}
            className="mt-3 inline-block rounded bg-yellow-600 px-4 py-2 text-sm text-white"
          >
            Firmendaten vervollständigen
          </Link>
        </section>
      )}

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Status Lohnabrechnung</p>

            <h2 className="mt-1 text-2xl font-bold">
              {payrollReady ? "Bereit für die Abrechnung" : "Noch nicht bereit"}
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              {payrollReady
                ? "Alle Firmendaten, Mitarbeiterdaten und Pflichtdokumente sind vorhanden."
                : "Es gibt noch offene Punkte, bevor die Lohnabrechnung vorbereitet werden kann."}
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              payrollReady
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {payrollReady ? "Bereit" : "Nicht bereit"}
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-1 flex justify-between text-sm">
            <span>Vollständigkeit Mitarbeiter</span>
            <span>{progress}%</span>
          </div>

          <div className="h-3 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-900"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Offene Aufgaben</p>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {totalOpenTasks}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Mitarbeiter</p>
          <p className="mt-2 text-3xl font-bold">{totalEmployees}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Vollständig</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {readyEmployees.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Offene Fehlzeiten</p>
          <p className="mt-2 text-3xl font-bold text-yellow-700">
            {openAbsences.length}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Was ist offen?</h2>

            <Link
              href={`/dashboard/${companyId}/tasks`}
              className="text-sm font-medium text-blue-900"
            >
              Aufgaben
            </Link>
          </div>

          {missingCompanyFields.length > 0 && (
            <div className="mb-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-medium text-yellow-900">
                Firmendaten unvollständig
              </p>

              <p className="mt-1 text-sm text-yellow-800">
                Fehlend: {missingCompanyFields.join(", ")}
              </p>

              <Link
                href={`/dashboard/${companyId}/company-data`}
                className="mt-3 inline-block rounded bg-yellow-600 px-3 py-2 text-sm text-white"
              >
                Firmendaten bearbeiten
              </Link>
            </div>
          )}

          {notReadyEmployees.length === 0 ? (
            <p className="text-sm text-green-700">
              Keine offenen Mitarbeiterdaten ✅
            </p>
          ) : (
            <div className="space-y-3">
              {notReadyEmployees.slice(0, 5).map((employee) => (
                <div key={employee.id} className="rounded-xl border p-4">
                  <p className="font-medium">
                    {employee.firstName} {employee.lastName}
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    Fehlend: {employee.missing.join(", ")}
                  </p>

                  <Link
                    href={`/dashboard/${companyId}/employees/${employee.id}`}
                    className="mt-3 inline-block rounded bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
                  >
                    Bearbeiten
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Offene Anträge</h2>

            <Link
              href={`/dashboard/${companyId}/absences`}
              className="text-sm font-medium text-blue-900"
            >
              Fehlzeiten
            </Link>
          </div>

          {openAbsences.length === 0 ? (
            <p className="text-sm text-green-700">
              Keine offenen Fehlzeitenanträge ✅
            </p>
          ) : (
            <div className="space-y-3">
              {openAbsences.slice(0, 5).map((absence) => (
                <div key={absence.id} className="rounded-xl border p-4">
                  <p className="font-medium">{absence.employeeName}</p>

                  <p className="mt-1 text-sm text-gray-600">
                    {getAbsenceLabel(absence.absenceType)} ·{" "}
                    {absence.startDate} bis {absence.endDate}
                  </p>

                  <span className="mt-3 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                    Beantragt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold">Schnellaktionen</h2>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/${companyId}/employees`}
            className="rounded-xl bg-blue-900 px-4 py-3 text-sm font-medium text-white hover:bg-blue-800"
          >
            Mitarbeiter verwalten
          </Link>

          <Link
            href={`/dashboard/${companyId}/monthly`}
            className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium hover:bg-gray-200"
          >
            Monatsübersicht
          </Link>

          <Link
            href={`/dashboard/${companyId}/tasks`}
            className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium hover:bg-gray-200"
          >
            Aufgaben verwalten
          </Link>

          <Link
            href={`/dashboard/${companyId}/absences`}
            className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium hover:bg-gray-200"
          >
            Fehlzeiten prüfen
          </Link>

          <Link
            href={`/dashboard/${companyId}/company-data`}
            className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium hover:bg-gray-200"
          >
            Firmendaten prüfen
          </Link>
        </div>
      </section>
    </main>
  );
}