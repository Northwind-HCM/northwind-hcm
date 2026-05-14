import AbsenceManager from "@/components/AbsenceManager";

export default async function AbsencesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <AbsenceManager companyId={companyId} />
    </main>
  );
}