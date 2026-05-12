import Link from "next/link";

function ReadinessItem({
  label,
  done = false,
}: {
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white p-4">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {done ? "✓" : "!"}
      </span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-24 lg:grid-cols-2 lg:items-center">
        {/* LEFT */}
        <div>
          <div className="inline-flex items-center rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-900 shadow-sm">
            Entwickelt aus echter deutscher Payroll-Praxis
          </div>

          <h1 className="mt-6 text-5xl font-bold tracking-tight text-gray-900 md:text-6xl">
            Payroll & HCM
            <span className="block text-blue-900">
              für Deutschland.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Mitarbeiterdaten, Dokumente, Employee Self-Service,
            Fehlzeiten und Payroll Readiness — in einer Plattform.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/early-access"
              className="rounded-2xl bg-blue-900 px-7 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-800"
            >
              Early Access anfragen
            </Link>

            <a
              href="mailto:payroll@northwind-hr.de"
              className="rounded-2xl border border-gray-300 bg-white px-7 py-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Demo buchen
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-gray-500">
            <span>✓ Payroll Ready</span>
            <span>✓ Employee Self Service</span>
            <span>✓ Deutsche Compliance</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative">
          <div className="absolute -left-10 top-10 h-72 w-72 rounded-full bg-blue-100 blur-3xl" />

          <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="text-sm text-gray-500">
                  Payroll Readiness
                </p>

                <h3 className="text-xl font-semibold">
                  Mitarbeiterprofil
                </h3>
              </div>

              <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                Unvollständig
              </div>
            </div>

            {/* Content */}
            <div className="mt-6 space-y-4">
              <ReadinessItem
                label="Steuer-ID vorhanden"
                done
              />

              <ReadinessItem
                label="Sozialversicherung fehlt"
              />

              <ReadinessItem
                label="Krankenkasse vorhanden"
                done
              />

              <ReadinessItem label="IBAN fehlt" />

              <ReadinessItem
                label="Personalakte unvollständig"
              />
            </div>

            {/* Bottom */}
            <div className="mt-8 rounded-2xl bg-blue-900 p-5 text-white">
              <p className="text-sm text-blue-100">
                Payroll Status
              </p>

              <p className="mt-2 text-3xl font-bold">
                82%
              </p>

              <p className="mt-2 text-sm text-blue-100">
                Alle fehlenden Angaben sofort sichtbar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}