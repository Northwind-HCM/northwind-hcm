// src/app/dashboard/[companyId]/employees/page.tsx

import Link from "next/link";
import EmployeeList from "../../../../components/EmployeeList";

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mitarbeiter</h1>
          <p className="text-gray-600">
            Mitarbeiter verwalten, bearbeiten, einladen oder archivieren.
          </p>
        </div>

        <Link
          href={`/dashboard/${companyId}/employees/new`}
          className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white"
        >
          Neuen Mitarbeiter anlegen
        </Link>
      </div>

      <EmployeeList companyId={companyId} />
    </main>
  );
}