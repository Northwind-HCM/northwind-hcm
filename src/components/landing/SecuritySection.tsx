export default function SecuritySection() {
  return (
    <section
      id="security"
      className="bg-gray-50 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-900">
              Sicherheit & Compliance
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
              Sensible Payroll-Daten brauchen Vertrauen.
            </h2>

            <p className="mt-6 text-lg leading-8 text-gray-600">
              Northwind HCM wurde speziell für deutsche Payroll-
              und HR-Prozesse entwickelt — mit Fokus auf
              Datenschutz, Rollenrechte und strukturierte
              Payroll-Vorbereitung.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Rollen- & Rechtekonzept
              </h3>

              <p className="mt-2 text-gray-600">
                Mitarbeiter, Teamleiter, HR und Payroll erhalten
                nur Zugriff auf relevante Daten.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Deutsche Payroll-Prozesse
              </h3>

              <p className="mt-2 text-gray-600">
                ELStAM, Sozialversicherung, BG, A1, PKV und
                Payroll-Readiness direkt integriert.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold">
                Cloud Infrastruktur
              </h3>

              <p className="mt-2 text-gray-600">
                Moderne Cloud-Architektur mit Firebase,
                verschlüsselter Kommunikation und Zugriffsschutz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}