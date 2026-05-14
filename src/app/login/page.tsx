import Link from "next/link";

export default function LoginSelectionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900">
            Northwind Login
          </h1>

          <p className="mt-2 text-gray-600">
            Bitte wählen Sie den passenden Zugangsbereich.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/client/login"
            className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-4 inline-flex rounded-xl bg-blue-50 p-3 text-blue-900">
              🏢
            </div>

            <h2 className="text-xl font-semibold text-blue-900">
              Mandanten
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Login für HR, Payroll und Unternehmenszugänge.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-900">
              Zum Mandantenportal →
            </p>
          </Link>

          <Link
            href="/employee/login"
            className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-4 inline-flex rounded-xl bg-green-50 p-3 text-green-900">
              👤
            </div>

            <h2 className="text-xl font-semibold text-blue-900">
              Mitarbeiter
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Zugriff auf Self-Service, Dokumente und Abwesenheiten.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-900">
              Zum Mitarbeiterportal →
            </p>
          </Link>

          <Link
            href="/admin/login"
            className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="mb-4 inline-flex rounded-xl bg-gray-100 p-3 text-gray-900">
              ⚙️
            </div>

            <h2 className="text-xl font-semibold text-blue-900">
              Northwind Admin
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Interner Verwaltungsbereich für Northwind Administratoren.
            </p>

            <p className="mt-4 text-sm font-medium text-blue-900">
              Zum Adminbereich →
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}