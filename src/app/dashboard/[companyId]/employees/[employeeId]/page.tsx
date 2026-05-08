// src/app/dashboard/[companyId]/employees/[employeeId]/page.tsx

import { notFound, redirect } from "next/navigation";
import EmployeeTabs from "@/components/EmployeeTabs";
import EmployeeDetailForm from "@/components/EmployeeDetailForm";
import EmployeeDocuments from "@/components/EmployeeDocuments";
import EmployeePayrollForm from "@/components/EmployeePayrollForm";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  canAccessEmployee,
  canViewPayroll,
  hasPermission,
} from "@/lib/auth/roles";

type PageProps = {
  params: Promise<{
    companyId: string;
    employeeId: string;
  }>;
};

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { companyId, employeeId } = await params;

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const target = {
    companyId,
    employeeId,
  };

  if (!canAccessEmployee(user, target)) {
    notFound();
  }

  const showPayroll = canViewPayroll(user, target);
  const canEditEmployee = hasPermission(user, "employees.edit");
  const canViewDocuments = hasPermission(user, "documents.view");

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
                readOnly={!canEditEmployee}
              />
            ),
          },
          ...(showPayroll
            ? [
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
              ]
            : []),
          ...(canViewDocuments
            ? [
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
              ]
            : []),
        ]}
      />
    </main>
  );
}