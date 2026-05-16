"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  checkEmployeeReadiness,
  checkDocuments,
} from "@/lib/payrollReadiness";

type EmployeePayrollItem = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  position?: string;
  ready: boolean;
  missing: string[];
};

export default function PayrollPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const [employees, setEmployees] = useState<EmployeePayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPayrollReadiness() {
    setLoading(true);
    setMessage("");

    try {
      const employeesSnapshot = await getDocs(
        query(
          collection(db, "companies", companyId, "employees"),
          orderBy("lastName", "asc")
        )
      );

      const employeeItems = await Promise.all(
        employeesSnapshot.docs.map(async (employeeDoc) => {
          const employeeData = employeeDoc.data();

          let documents: any[] = [];

          try {
            const documentsSnapshot = await getDocs(
              collection(
                db,
                "companies",
                companyId,
                "employees",
                employeeDoc.id,
                "documents"
              )
            );

            documents = documentsSnapshot.docs.map((documentDoc) =>
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
            email: employeeData.email || "",
            department: employeeData.department || "",
            position: employeeData.position || "",
            ready: employeeCheck.ready && documentCheck.ready,
            missing: [...employeeCheck.missing, ...documentCheck.missing],
          };
        })
      );

      setEmployees(employeeItems);
    } catch (error: any) {
      console.error(error);
      setMessage(`Payroll Readiness konnte nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayrollReadiness();
  }, [companyId]);

  const readyEmployees = useMemo(
    () => employees.filter((employee) => employee.ready),
    [employees]
  );

  const notReadyEmployees = useMemo(
    () => employees.filter((employee) => !employee.ready),
    [employees]
  );

  const payrollReady =
    employees.length > 0 && notReadyEmployees.length === 0;

  const progress =
    employees.length === 0
      ? 0
      : Math.round((readyEmployees.length / employees.length) * 100);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Payroll Readiness...
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payroll Readiness</h1>

          <p className="text-gray-600">
            Prüfung, ob alle relevanten Daten und Dokumente für die Abrechnung vollständig sind.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/${companyId}`}
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
          >
            Zurück
          </Link>

          <Link
            href={`/dashboard/${companyId}/monthly`}
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Monatsübersicht
          </Link>
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {message}
        </p>
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
                ? "Alle Mitarbeiterdaten und Pflichtdokumente sind vollständig."
                : "Es gibt noch offene Punkte, bevor die Abrechnung vorbereitet werden kann."}
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
            <span>Vollständigkeit</span>
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Mitarbeiter gesamt</p>
          <p className="mt-2 text-3xl font-bold">{employees.length}</p>
        </div>

        <div className="rounded-2xl bg-green-50 p-5 text-green-900 shadow">
          <p className="text-sm opacity-75">Bereit</p>
          <p className="mt-2 text-3xl font-bold">{readyEmployees.length}</p>
        </div>

        <div className="rounded-2xl bg-red-50 p-5 text-red-900 shadow">
          <p className="text-sm opacity-75">Nicht bereit</p>
          <p className="mt-2 text-3xl font-bold">{notReadyEmployees.length}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Mitarbeiterprüfung</h2>

            <p className="text-sm text-gray-600">
              Offene Stammdaten und Dokumente je Mitarbeiter.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPayrollReadiness}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Aktualisieren
          </button>
        </div>

        {employees.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Keine Mitarbeiter vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Mitarbeiter</th>
                  <th className="p-3 font-semibold">Bereich</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Offene Punkte</th>
                  <th className="p-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-medium">
                        {employee.firstName} {employee.lastName}
                      </p>

                      {employee.email && (
                        <p className="text-xs text-gray-500">
                          {employee.email}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      <p>{employee.department || "-"}</p>
                      {employee.position && (
                        <p className="text-xs text-gray-500">
                          {employee.position}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          employee.ready
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {employee.ready ? "Bereit" : "Nicht bereit"}
                      </span>
                    </td>

                    <td className="p-3">
                      {employee.missing.length === 0 ? (
                        <span className="text-green-700">
                          Alles vollständig ✅
                        </span>
                      ) : (
                        <ul className="list-disc space-y-1 pl-5 text-red-700">
                          {employee.missing.map((item) => (
                            <li key={`${employee.id}-${item}`}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <Link
                        href={`/dashboard/${companyId}/employees/${employee.id}`}
                        className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200"
                      >
                        Bearbeiten
                      </Link>
                    </td>
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