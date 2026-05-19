import CompanyAccessGuard from "@/components/CompanyAccessGuard";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopbar from "@/components/DashboardTopbar";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <CompanyAccessGuard companyId={companyId}>
      <div className="flex min-h-screen bg-gray-100">
        <DashboardSidebar companyId={companyId} />

        <div className="flex flex-1 flex-col">
          <DashboardTopbar companyId={companyId} />

          <main className="flex-1 px-8 py-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </CompanyAccessGuard>
  );
}