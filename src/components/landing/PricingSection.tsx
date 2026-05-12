type PriceCardProps = {
  title: string;
  price: string;
  unit: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

function PriceCard({
  title,
  price,
  unit,
  description,
  features,
  highlighted = false,
}: PriceCardProps) {
  return (
    <div
      className={`rounded-3xl border p-8 transition ${
        highlighted
          ? "border-blue-900 bg-blue-900 text-white shadow-2xl"
          : "border-gray-200 bg-white shadow-sm"
      }`}
    >
      <h3 className="text-2xl font-bold">{title}</h3>

      <p
        className={`mt-3 text-sm ${
          highlighted ? "text-blue-100" : "text-gray-600"
        }`}
      >
        {description}
      </p>

      <div className="mt-8">
        <span className="text-4xl font-bold">{price}</span>
        <span
          className={`ml-2 text-sm ${
            highlighted ? "text-blue-100" : "text-gray-500"
          }`}
        >
          {unit}
        </span>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature) => (
          <li
            key={feature}
            className={`flex items-start gap-3 text-sm ${
              highlighted ? "text-blue-50" : "text-gray-700"
            }`}
          >
            <span>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href="/early-access"
        className={`mt-10 block w-full rounded-2xl px-5 py-3 text-center font-semibold transition ${
          highlighted
            ? "bg-white text-blue-900 hover:bg-blue-50"
            : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        Early Access anfragen
      </a>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-900">
            Early Access
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Faire Einstiegspreise für Pilotkunden
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Wir öffnen die Plattform aktuell für ausgewählte Unternehmen, die
            Payroll- und HR-Prozesse digitalisieren möchten.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          <PriceCard
            title="HCM Starter"
            price="5,00 €"
            unit="/ Mitarbeiter / Monat"
            description="Für digitale Stammdaten, ESS und einfache HR-Prozesse."
            features={[
              "Mitarbeiterverwaltung",
              "Employee Self-Service",
              "Digitale Personalakte",
              "Dokumentenverwaltung",
              "Basis-Fehlzeiten",
            ]}
          />

          <PriceCard
            title="HCM + Payroll"
            price="17,00 €"
            unit="/ Mitarbeiter / Monat"
            description="Für Unternehmen, die Plattform und Payroll-Service kombinieren möchten."
            highlighted
            features={[
              "Alle Starter-Funktionen",
              "Lohnabrechnung durch Northwind",
              "Payroll Readiness",
              "Fehlzeitenmanagement",
              "Payroll Dashboard",
              "Persönlicher Ansprechpartner",
            ]}
          />

          <PriceCard
            title="Payroll Service"
            price="12,50 €"
            unit="/ Mitarbeiter / Abrechnung"
            description="Für klassische Lohnabrechnung durch Northwind Payroll."
            features={[
              "Lohnabrechnung",
              "Meldewesen",
              "Payroll Support",
              "Deutsche Payroll Expertise",
              "Optionaler Plattformzugang",
            ]}
          />
        </div>
      </div>
    </section>
  );
}