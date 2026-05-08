import EmployeePayrollDataForm from "@/components/EmployeePayrollDataForm";

export default async function EmployeePayrollDataPage({
  params,
}: {
  params: Promise<{ companyId: string; employeeId: string }>;
}) {
  const { companyId, employeeId } = await params;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payroll-Daten</h1>
        <p className="text-gray-600">
          Interne Abrechnungsdaten, Vergütung, Benefits und Kostenstellen.
        </p>
      </div>

      <EmployeePayrollDataForm companyId={companyId} employeeId={employeeId} />
    </main>
  );
}