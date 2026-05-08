export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-gray-900">Datenschutzerklärung</h1>

        <div className="mt-10 space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
            <p className="mt-4 leading-7">
              Verantwortlich für die Datenverarbeitung auf dieser Website und innerhalb der Plattform ist:
            </p>
            <div className="mt-4 space-y-1">
              <p>Northwind Payroll & HR Consulting GmbH</p>
              <p>[Straße & Hausnummer]</p>
              <p>[PLZ Ort]</p>
              <p>E-Mail: payroll@northwind-hr.de</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Zweck der Verarbeitung</h2>
            <p className="mt-4 leading-7">
              Wir verarbeiten personenbezogene Daten zur Bereitstellung unserer HCM- und Payroll-Plattform,
              zur Verwaltung von Mitarbeiterstammdaten, Dokumenten, Fehlzeiten, Benutzerkonten und zur
              Vorbereitung von Lohn- und Gehaltsabrechnungsprozessen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Verarbeitete Datenarten</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Kontaktdaten, z. B. Name, E-Mail-Adresse, Telefonnummer</li>
              <li>Mitarbeiterstammdaten, z. B. Adresse, Geburtsdatum, Bankdaten</li>
              <li>Payroll-relevante Daten, z. B. Steuer-ID, Sozialversicherungsnummer, Krankenkasse</li>
              <li>Dokumente, z. B. Verträge, Bescheinigungen und Gehaltsunterlagen</li>
              <li>Nutzungs- und Login-Daten innerhalb der Plattform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Rechtsgrundlagen</h2>
            <p className="mt-4 leading-7">
              Die Verarbeitung erfolgt je nach Zweck auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
              zur Vertragserfüllung, Art. 6 Abs. 1 lit. c DSGVO zur Erfüllung gesetzlicher Pflichten
              sowie Art. 6 Abs. 1 lit. f DSGVO aufgrund berechtigter Interessen an einem sicheren und
              effizienten Plattformbetrieb.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Hosting und technische Infrastruktur</h2>
            <p className="mt-4 leading-7">
              Für den Betrieb der Plattform nutzen wir Cloud-Dienste, insbesondere Firebase / Google Cloud,
              zur Authentifizierung, Datenbankverwaltung und technischen Bereitstellung der Anwendung.
              Dabei können technische Verbindungsdaten wie IP-Adresse, Zeitpunkt des Zugriffs und
              Geräteinformationen verarbeitet werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Benutzerkonten und Login</h2>
            <p className="mt-4 leading-7">
              Für die Nutzung geschützter Bereiche werden Benutzerkonten eingerichtet. Dabei werden
              insbesondere E-Mail-Adresse, Benutzerrolle, Mandantenzuordnung und technische Login-Daten
              verarbeitet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Employee Self-Service</h2>
            <p className="mt-4 leading-7">
              Mitarbeiter können über den Employee Self-Service eigene Daten einsehen, ergänzen und
              Dokumente bereitstellen. Die Verarbeitung erfolgt zur Vorbereitung und Durchführung von
              HR- und Payroll-Prozessen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Empfänger von Daten</h2>
            <p className="mt-4 leading-7">
              Daten können, soweit erforderlich, an interne HR-/Payroll-Verantwortliche, beauftragte
              Dienstleister, Steuerberater, Sozialversicherungsträger, Finanzbehörden oder andere gesetzlich
              vorgesehene Empfänger übermittelt werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Speicherdauer</h2>
            <p className="mt-4 leading-7">
              Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke
              erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Ihre Rechte</h2>
            <p className="mt-4 leading-7">
              Betroffene Personen haben nach Maßgabe der DSGVO insbesondere das Recht auf Auskunft,
              Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie
              Widerspruch gegen bestimmte Verarbeitungen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Beschwerderecht</h2>
            <p className="mt-4 leading-7">
              Betroffene Personen haben das Recht, sich bei einer zuständigen Datenschutzaufsichtsbehörde
              zu beschweren.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Stand</h2>
            <p className="mt-4">Stand: Mai 2026</p>
          </section>
        </div>
      </div>
    </main>
  );
}