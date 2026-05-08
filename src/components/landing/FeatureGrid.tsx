const features = [
  {
    title: "Employee Self-Service",
    text: "Mitarbeiter pflegen Stammdaten, Dokumente und Fehlzeiten selbstständig.",
  },
  {
    title: "Payroll Readiness",
    text: "Fehlende Angaben für die Lohnabrechnung sofort erkennen.",
  },
  {
    title: "Elektronische Personalakte",
    text: "Arbeitsverträge, Bescheinigungen und Payroll-Dokumente zentral verwalten.",
  },
  {
    title: "Fehlzeitenmanagement",
    text: "Urlaub, Krankheit, Elternzeit und Sonderfälle digital verwalten.",
  },
  {
    title: "Deutsche Payroll-Logik",
    text: "ELStAM, Sozialversicherung, BG, A1, PKV und bAV direkt mitgedacht.",
  },
  {
    title: "Payroll Exporte",
    text: "Vorbereitung für DATEV, Agenda, SAP und individuelle Schnittstellen.",
  },
];

export default function FeatureGrid() {
  return (
    <section
      id="features"
      className="bg-gray-50 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-900">
            Funktionen
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Entwickelt für echte deutsche Payroll-Prozesse
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Keine generische HR-Software, sondern eine Plattform
            für Payroll-Readiness, Employee Self-Service und
            digitale Personalprozesse.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-900">
                ✓
              </div>

              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                {feature.title}
              </h3>

              <p className="mt-3 leading-7 text-gray-600">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}