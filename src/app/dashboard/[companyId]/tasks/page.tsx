import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import {
  checkEmployeeReadiness,
  checkDocuments,
} from "../../../../lib/payrollReadiness";

export default async function TasksPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const employeesSnap = await getDocs(
    collection(db, "companies", companyId, "employees")
  );

  const employees = await Promise.all(
    employeesSnap.docs.map(async (employeeDoc) => {
      const employeeData = employeeDoc.data();

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

      const documents = documentsSnap.docs.map((doc) => doc.data());

      const employeeCheck = checkEmployeeReadiness(employeeData);
      const documentCheck = checkDocuments(employeeData, documents);

      return {
        id: employeeDoc.id,
        name: `${employeeData.firstName || ""} ${
          employeeData.lastName || ""
        }`,
        missing: [...employeeCheck.missing, ...documentCheck.missing],
      };
    })
  );

  const openEmployees = employees.filter(
    (employee) => employee.missing.length > 0
  );

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offene Aufgaben</h1>
        <p className="text-gray-600">
          Diese Punkte müssen noch erledigt werden, bevor die Lohnabrechnung vollständig ist.
        </p>
      </div>

      {openEmployees.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow">
          <p className="text-green-700">
            Alles erledigt ✅ – keine offenen Aufgaben
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {openEmployees.map((employee) => (
            <div key={employee.id} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{employee.name}</h2>
                  <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
                    {employee.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={`/dashboard/${companyId}/employees/${employee.id}`}
                  className="rounded bg-blue-900 px-4 py-2 text-sm text-white"
                >
                  Bearbeiten
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}