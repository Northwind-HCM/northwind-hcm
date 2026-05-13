import Link from "next/link";


export default function LoginSelectionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900">
            Login auswählen
          </h1>

          <p className="mt-2 text-gray-600">
            Bitte wählen Sie den passenden Bereich.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/client/login"
            className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold text-blue-900">
              Mandanten
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Login für HR, Payroll und Unternehmen.
            </p>
          </Link>

          <Link
            href="/employee/login"
            className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h2 className="text-xl font-semibold text-blue-900">
              Mitarbeiter
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Zugriff auf Self-Service und Dokumente.
            </p>
          </Link>
<Link
  href="/client/login"
  className="rounded-2xl bg-white p-6 shadow transition hover:shadow-lg"
>
            <h2 className="text-xl font-semibold text-blue-900">
              Northwind Admin
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Interner Verwaltungsbereich.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}