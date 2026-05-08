import CompanyMasterDataForm from "@/components/CompanyMasterDataForm";

export default async function CompanyDataPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <main className="p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold">Firmenstammdaten</h1>

        <CompanyMasterDataForm companyId={companyId} />
      </div>
    </main>
  );
}