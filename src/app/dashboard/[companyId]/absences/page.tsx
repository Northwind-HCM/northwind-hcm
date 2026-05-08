import AbsenceManager from "../../../../components/AbsenceManager";

export default async function AbsencesPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  return (
    <main>
      <AbsenceManager companyId={companyId} />
    </main>
  );
}