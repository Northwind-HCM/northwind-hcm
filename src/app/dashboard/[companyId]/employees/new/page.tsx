import EmployeeForm from "../../../../../components/EmployeeForm";

export default async function NewEmployeePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Neuen Mitarbeiter anlegen</h1>
        <p className="text-gray-600">
          Mitarbeiterdaten für die Lohn- und Gehaltsabrechnung erfassen.
        </p>
      </div>

      <EmployeeForm companyId={companyId} />
    </main>
  );
}