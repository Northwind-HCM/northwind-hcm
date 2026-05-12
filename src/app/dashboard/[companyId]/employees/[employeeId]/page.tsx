// src/app/dashboard/[companyId]/employees/[employeeId]/page.tsx

import EmployeeTabs from "@/components/EmployeeTabs";
import EmployeeDetailForm from "@/components/EmployeeDetailForm";
import EmployeeDocuments from "@/components/EmployeeDocuments";
import EmployeePayrollForm from "@/components/EmployeePayrollForm";

type PageProps = {
  params: Promise<{
    companyId: string;
    employeeId: string;
  }>;
};

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { companyId, employeeId } = await params;

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mitarbeiterdetails</h1>
        <p className="text-gray-600">
          Stammdaten, Payroll und Dokumente verwalten
        </p>
      </div>

      <EmployeeTabs
        tabs={[
          {
            key: "personal",
            label: "Stammdaten",
            content: (
              <EmployeeDetailForm
                companyId={companyId}
                employeeId={employeeId}
                readOnly={false}
              />
            ),
          },
          {
            key: "payroll",
            label: "Payroll",
            content: (
              <EmployeePayrollForm
                companyId={companyId}
                employeeId={employeeId}
              />
            ),
          },
          {
            key: "documents",
            label: "Dokumente",
            content: (
              <EmployeeDocuments
                companyId={companyId}
                employeeId={employeeId}
              />
            ),
          },
        ]}
      />
    </main>
  );
}