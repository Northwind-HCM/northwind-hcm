type Props = {
  companyId: string;
  employeeId: string;
};

export default function EmployeePayrollForm({ companyId, employeeId }: Props) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="text-lg font-semibold">Payroll-Daten</h2>
      <p className="text-sm text-gray-500">
        Payroll-Informationen für Mitarbeiter {employeeId} in Firma {companyId}.
      </p>
    </div>
  );
}