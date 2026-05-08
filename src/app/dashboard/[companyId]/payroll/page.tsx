import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import {
  checkEmployeeReadiness,
  checkDocuments,
} from "../../../../lib/payrollReadiness";

export default async function PayrollPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const employeesSnapshot = await getDocs(
    collection(db, "companies", companyId, "employees")
  );

  const employees = await Promise.all(
    employeesSnapshot.docs.map(async (employeeDoc) => {
      const employeeData = employeeDoc.data();

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

      const documents = documentsSnapshot.docs.map((documentDoc) =>
        documentDoc.data()
      );

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

  const readyEmployees = employees.filter((employee) => employee.ready);
  const notReadyEmployees = employees.filter((employee) => !employee.ready);

  const payrollReady =
    employees.length > 0 && notReadyEmployees.length === 0;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll Readiness</h1>
        <p className="text-gray-600">
          Prüfung, ob alle relevanten Daten und Dokumente für die Abrechnung vollständig sind.
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Status</h2>

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
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-3 font-semibold">Bereit</h3>
          <p className="text-2xl font-bold text-green-700">
            {readyEmployees.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="mb-3 font-semibold">Nicht bereit</h3>
          <p className="text-2xl font-bold text-red-700">
            {notReadyEmployees.length}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow">
        <h3 className="mb-4 font-semibold">
          Mitarbeiter mit offenen Punkten
        </h3>

        {notReadyEmployees.length === 0 ? (
          <p className="text-green-700">Alles vollständig ✅</p>
        ) : (
          <div className="space-y-3">
            {notReadyEmployees.map((employee) => (
              <div key={employee.id} className="rounded border p-3">
                <p className="font-medium">
                  {employee.firstName} {employee.lastName}
                </p>
                <p className="text-sm text-red-700">
                  Fehlend: {employee.missing.join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}