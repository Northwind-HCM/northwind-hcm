type PriceCardProps = {
  title: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

function PriceCard({
  title,
  price,
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
      <h3 className="text-2xl font-bold">
        {title}
      </h3>

      <p
        className={`mt-3 text-sm ${
          highlighted ? "text-blue-100" : "text-gray-600"
        }`}
      >
        {description}
      </p>

      <div className="mt-8">
        <span className="text-4xl font-bold">
          {price}
        </span>

        <span
          className={`ml-2 text-sm ${
            highlighted ? "text-blue-100" : "text-gray-500"
          }`}
        >
          / Monat
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

      <button
        className={`mt-10 w-full rounded-2xl px-5 py-3 font-semibold transition ${
          highlighted
            ? "bg-white text-blue-900 hover:bg-blue-50"
            : "bg-blue-900 text-white hover:bg-blue-800"
        }`}
      >
        Early Access
      </button>
    </div>
  );
}

export default function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-900">
            Early Access
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-gray-900">
            Faire Einstiegspreise für Pilotkunden
          </h2>

          <p className="mt-5 text-lg text-gray-600">
            Wir öffnen die Plattform aktuell für ausgewählte
            Unternehmen, die Payroll-Prozesse digitalisieren möchten.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          <PriceCard
            title="Starter"
            price="19 €"
            description="Für kleine Teams und digitale Stammdaten."
            features={[
              "Mitarbeiterverwaltung",
              "Employee Self-Service",
              "Digitale Personalakte",
              "Dokumentenverwaltung",
            ]}
          />

          <PriceCard
            title="Payroll Ready"
            price="49 €"
            description="Für professionelle Payroll-Vorbereitung."
            highlighted
            features={[
              "Payroll Readiness",
              "Fehlzeitenmanagement",
              "Workflows",
              "Dokumente",
              "Payroll Dashboard",
              "HR Prozesse",
            ]}
          />

          <PriceCard
            title="Payroll Service"
            price="12,50 €"
            description="Payroll Outsourcing inklusive Plattform."
            features={[
              "Lohnabrechnung",
              "ESS & Portal",
              "Persönlicher Ansprechpartner",
              "Deutsche Payroll Expertise",
            ]}
          />
        </div>
      </div>
    </section>
  );
}