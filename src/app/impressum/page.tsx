export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900">
          Impressum
        </h1>

        <div className="mt-10 space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold">
              Angaben gemäß § 5 TMG
            </h2>

            <div className="mt-4 space-y-1">
              <p>Northwind Payroll & HR Consulting GmbH</p>
              <p>Claus-von-Stauffenberg-Weg 1c</p>
              <p>21684 Stade</p>
              <p>Deutschland</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Vertreten durch
            </h2>

            <p className="mt-4">
              Geschäftsführer: Roland Schrader
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Kontakt
            </h2>

            <div className="mt-4 space-y-1">
              <p>E-Mail: kontakt@northwind-hr.de</p>
              <p>Web: northwind-hr.eu</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Handelsregister
            </h2>

            <div className="mt-4 space-y-1">
              <p>Registergericht: Amtsgericht Tostedt</p>
              <p>Registernummer: HRB 208053</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Umsatzsteuer-ID
            </h2>

            <p className="mt-4">
              Umsatzsteuer-Identifikationsnummer gemäß §27a UStG:
              DE330524091
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </h2>

            <div className="mt-4 space-y-1">
              <p>Roland Schrader</p>
              <p>Claus-von-Stauffenberg 1c</p>
              <p>21684 Stade</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              Haftungsausschluss
            </h2>

            <p className="mt-4 leading-7">
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir
              keine Haftung für die Inhalte externer Links. Für den
              Inhalt der verlinkten Seiten sind ausschließlich deren
              Betreiber verantwortlich.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}