"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FormField from "@/components/FormField";

type Props = {
  companyId: string;
};

const inputClass = "w-full rounded border p-3";

const initialFormData = {
  companyName: "",
  legalForm: "",
  street: "",
  zip: "",
  city: "",
  federalState: "",
  country: "",
  phone: "",
  email: "",
  managingDirector: "",

  bank: "",
  iban: "",
  bic: "",

  taxOffice: "",
  taxNumber: "",
  vatId: "",
  wageTaxRegistrationStatus: "",

  companyNumber: "",
  employerRegistrationStatus: "",

  tradeAssociation: "",
  bgCompanyNumber: "",
  bgPin: "",

  payrollStartMonth: "",
  employeeCount: "",
  weeklyWorkingHours: "",
  employmentTypes: "",

  wageTaxPaymentMethod: "",
  socialSecurityPaymentMethod: "",
  paymentExecution: "",

  chartOfAccounts: "",
  datevExport: "",
  agendaExport: "",
  sapExport: "",
  csvExport: "",

  previousPayroll: "",
  previousProvider: "",
  previousSystem: "",
  lastPayrollMonth: "",
  payrollAccountsAvailable: "",
  priorYearDataAvailable: "",
  elstamUsedPreviously: "",

  notes: "",
};

type FormKey = keyof typeof initialFormData;

type TabKey =
  | "company"
  | "address"
  | "tax"
  | "social"
  | "payroll"
  | "payments"
  | "exports"
  | "history"
  | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "company", label: "Unternehmen" },
  { key: "address", label: "Adresse" },
  { key: "tax", label: "Steuern" },
  { key: "social", label: "SV & BG" },
  { key: "payroll", label: "Payroll" },
  { key: "payments", label: "Zahlungen" },
  { key: "exports", label: "Exporte" },
  { key: "history", label: "Historie" },
  { key: "notes", label: "Notizen" },
];

export default function CompanyMasterDataForm({ companyId }: Props) {
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<TabKey>("company");
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const ref = doc(db, "companies", companyId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setFormData({
            ...initialFormData,
            ...(snap.data() as Partial<typeof initialFormData>),
          });
        }
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      } finally {
        setInitialLoading(false);
      }
    }

    loadData();
  }, [companyId]);

  function updateField(key: FormKey, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await setDoc(
        doc(db, "companies", companyId),
        {
          ...formData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Firmendaten gespeichert ✅");
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Speichern ❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return <p>Lade Firmenstammdaten...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow">
        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "company" && (
            <Section title="Unternehmensdaten">
              <FormField label="Firmenname" helper="Offizieller Name des Unternehmens." required>
                <input className={inputClass} value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} required />
              </FormField>

              <FormField label="Rechtsform" helper="z. B. GmbH, UG, AG, Ltd.">
                <input className={inputClass} value={formData.legalForm} onChange={(e) => updateField("legalForm", e.target.value)} />
              </FormField>

              <FormField label="Geschäftsführer / Vertretungsberechtigte Person" helper="Name der gesetzlichen Vertretung.">
                <input className={inputClass} value={formData.managingDirector} onChange={(e) => updateField("managingDirector", e.target.value)} />
              </FormField>

              <FormField label="E-Mail-Adresse" helper="Allgemeine Kontaktadresse für Payroll-Rückfragen." required>
                <input type="email" className={inputClass} value={formData.email} onChange={(e) => updateField("email", e.target.value)} required />
              </FormField>

              <FormField label="Telefon" helper="Telefonnummer für Rückfragen.">
                <input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "address" && (
            <Section title="Adresse">
              <FormField label="Straße und Hausnummer" helper="Offizielle Geschäftsanschrift." required>
                <input className={inputClass} value={formData.street} onChange={(e) => updateField("street", e.target.value)} required />
              </FormField>

              <FormField label="PLZ" helper="Postleitzahl der Geschäftsanschrift." required>
                <input className={inputClass} value={formData.zip} onChange={(e) => updateField("zip", e.target.value)} required />
              </FormField>

              <FormField label="Ort" helper="Ort der Geschäftsanschrift." required>
                <input className={inputClass} value={formData.city} onChange={(e) => updateField("city", e.target.value)} required />
              </FormField>

              <FormField label="Bundesland" helper="Relevant für Feiertage.">
                <input className={inputClass} value={formData.federalState} onChange={(e) => updateField("federalState", e.target.value)} />
              </FormField>

              <FormField label="Land" helper="Sitzland des Unternehmens.">
                <input className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "tax" && (
            <Section title="Steuerliche Daten">
              <FormField label="Finanzamt" helper="Zuständiges Finanzamt für Lohnsteuer.">
                <input className={inputClass} value={formData.taxOffice} onChange={(e) => updateField("taxOffice", e.target.value)} />
              </FormField>

              <FormField label="Steuernummer" helper="Arbeitgeber-Steuernummer für Lohnsteueranmeldungen.">
                <input className={inputClass} value={formData.taxNumber} onChange={(e) => updateField("taxNumber", e.target.value)} />
              </FormField>

              <FormField label="USt-IdNr." helper="Optional, falls vorhanden.">
                <input className={inputClass} value={formData.vatId} onChange={(e) => updateField("vatId", e.target.value)} />
              </FormField>

              <FormField label="Lohnsteuer-Registrierung vorhanden?" helper="Wichtig für die erste Lohnsteueranmeldung.">
                <Select value={formData.wageTaxRegistrationStatus} onChange={(value) => updateField("wageTaxRegistrationStatus", value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "social" && (
            <Section title="Sozialversicherung & Berufsgenossenschaft">
              <FormField label="Betriebsnummer" helper="Betriebsnummer des Arbeitgebers.">
                <input className={inputClass} value={formData.companyNumber} onChange={(e) => updateField("companyNumber", e.target.value)} />
              </FormField>

              <FormField label="Arbeitgeberregistrierung vorhanden?" helper="Status der Arbeitgeberregistrierung.">
                <select className={inputClass} value={formData.employerRegistrationStatus} onChange={(e) => updateField("employerRegistrationStatus", e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="yes">Ja</option>
                  <option value="no">Nein</option>
                  <option value="partial">Teilweise</option>
                </select>
              </FormField>

              <FormField label="Berufsgenossenschaft" helper="z. B. VBG, BGHW.">
                <input className={inputClass} value={formData.tradeAssociation} onChange={(e) => updateField("tradeAssociation", e.target.value)} />
              </FormField>

              <FormField label="BG-Unternehmensnummer" helper="Unternehmensnummer der Berufsgenossenschaft.">
                <input className={inputClass} value={formData.bgCompanyNumber} onChange={(e) => updateField("bgCompanyNumber", e.target.value)} />
              </FormField>

              <FormField label="BG-PIN" helper="PIN für BG-Zugang bzw. Meldungen.">
                <input className={inputClass} value={formData.bgPin} onChange={(e) => updateField("bgPin", e.target.value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "payroll" && (
            <Section title="Payroll Setup">
              <FormField label="Payroll-Startmonat" helper="Monat, ab dem Northwind übernimmt.">
                <input type="month" className={inputClass} value={formData.payrollStartMonth} onChange={(e) => updateField("payrollStartMonth", e.target.value)} />
              </FormField>

              <FormField label="Anzahl Mitarbeiter zum Start" helper="Geschätzte Anzahl der abzurechnenden Mitarbeiter.">
                <input className={inputClass} value={formData.employeeCount} onChange={(e) => updateField("employeeCount", e.target.value)} />
              </FormField>

              <FormField label="Reguläre Arbeitszeit pro Woche" helper="z. B. 40 Stunden.">
                <input className={inputClass} value={formData.weeklyWorkingHours} onChange={(e) => updateField("weeklyWorkingHours", e.target.value)} />
              </FormField>

              <FormField label="Beschäftigungsarten" helper="z. B. Vollzeit, Teilzeit, Minijob, Geschäftsführer.">
                <input className={inputClass} value={formData.employmentTypes} onChange={(e) => updateField("employmentTypes", e.target.value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "payments" && (
            <Section title="Bank & Zahlungsabwicklung">
              <FormField label="Bank" helper="Name der Bank.">
                <input className={inputClass} value={formData.bank} onChange={(e) => updateField("bank", e.target.value)} />
              </FormField>

              <FormField label="IBAN" helper="Für Zahlungsdateien oder Zahlungsinformationen.">
                <input className={inputClass} value={formData.iban} onChange={(e) => updateField("iban", e.target.value)} />
              </FormField>

              <FormField label="BIC" helper="Bei deutschen IBANs meist optional.">
                <input className={inputClass} value={formData.bic} onChange={(e) => updateField("bic", e.target.value)} />
              </FormField>

              <FormField label="Zahlungsart Lohnsteuer" helper="Wie wird die Lohnsteuer gezahlt?">
                <select className={inputClass} value={formData.wageTaxPaymentMethod} onChange={(e) => updateField("wageTaxPaymentMethod", e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="transfer">Überweisung</option>
                  <option value="direct_debit">Lastschriftmandat</option>
                </select>
              </FormField>

              <FormField label="Zahlungsart Sozialversicherung" helper="Wie werden SV-Beiträge gezahlt?">
                <select className={inputClass} value={formData.socialSecurityPaymentMethod} onChange={(e) => updateField("socialSecurityPaymentMethod", e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="transfer">Überweisung</option>
                  <option value="direct_debit">Lastschriftmandat</option>
                </select>
              </FormField>

              <FormField label="Wer führt die Zahlungen aus?" helper="Kunde zahlt selbst oder Northwind liefert SEPA-Datei.">
                <select className={inputClass} value={formData.paymentExecution} onChange={(e) => updateField("paymentExecution", e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="client">Kunde zahlt selbst</option>
                  <option value="northwind_sepa">Northwind liefert SEPA-Datei</option>
                  <option value="custom">Individuelle Abstimmung</option>
                </select>
              </FormField>
            </Section>
          )}

          {activeTab === "exports" && (
            <Section title="Buchhaltung & Export">
              <FormField label="Kontenrahmen" helper="Gewünschter Kontenrahmen.">
                <select className={inputClass} value={formData.chartOfAccounts} onChange={(e) => updateField("chartOfAccounts", e.target.value)}>
                  <option value="">Bitte auswählen</option>
                  <option value="SKR03">SKR03</option>
                  <option value="SKR04">SKR04</option>
                </select>
              </FormField>

              <FormField label="DATEV-Export benötigt?" helper="DATEV-Buchungsliste bereitstellen?">
                <Select value={formData.datevExport} onChange={(value) => updateField("datevExport", value)} />
              </FormField>

              <FormField label="Agenda-Export benötigt?" helper="Agenda-kompatibler Export?">
                <Select value={formData.agendaExport} onChange={(value) => updateField("agendaExport", value)} />
              </FormField>

              <FormField label="SAP-Export benötigt?" helper="SAP-kompatibler Export?">
                <Select value={formData.sapExport} onChange={(value) => updateField("sapExport", value)} />
              </FormField>

              <FormField label="CSV-Export benötigt?" helper="Frei definierbare CSV-Datei?">
                <Select value={formData.csvExport} onChange={(value) => updateField("csvExport", value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "history" && (
            <Section title="Vorabrechner / Historie">
              <FormField label="Gab es bereits eine Lohnabrechnung?" helper="Wichtig für Übernahme, Lohnkonten und Jahresmeldungen.">
                <Select value={formData.previousPayroll} onChange={(value) => updateField("previousPayroll", value)} />
              </FormField>

              <FormField label="Vorabrechner / bisheriger Provider" helper="Name des bisherigen Payroll Providers oder Steuerberaters.">
                <input className={inputClass} value={formData.previousProvider} onChange={(e) => updateField("previousProvider", e.target.value)} />
              </FormField>

              <FormField label="Bisheriges Abrechnungssystem" helper="z. B. DATEV, SAP, Agenda, Personio Payroll.">
                <input className={inputClass} value={formData.previousSystem} onChange={(e) => updateField("previousSystem", e.target.value)} />
              </FormField>

              <FormField label="Letzter Abrechnungsmonat" helper="Letzter Monat des bisherigen Providers.">
                <input type="month" className={inputClass} value={formData.lastPayrollMonth} onChange={(e) => updateField("lastPayrollMonth", e.target.value)} />
              </FormField>

              <FormField label="Lohnkonten vorhanden?" helper="Relevant für Jahreswerte und Lohnsteuerbescheinigungen.">
                <Select value={formData.payrollAccountsAvailable} onChange={(value) => updateField("payrollAccountsAvailable", value)} />
              </FormField>

              <FormField label="Vorjahresdaten vorhanden?" helper="Relevant bei unterjährigem Wechsel.">
                <Select value={formData.priorYearDataAvailable} onChange={(value) => updateField("priorYearDataAvailable", value)} />
              </FormField>

              <FormField label="ELStAM bisher genutzt?" helper="Wurde ELStAM bereits genutzt?">
                <Select value={formData.elstamUsedPreviously} onChange={(value) => updateField("elstamUsedPreviously", value)} />
              </FormField>
            </Section>
          )}

          {activeTab === "notes" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Anmerkungen</h2>

              <FormField label="Besondere Hinweise" helper="Besonderheiten zur Firma, Registrierung oder Payroll-Übernahme.">
                <textarea className="min-h-40 w-full rounded border p-3" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </FormField>
            </section>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Speichern"}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Select({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Bitte auswählen</option>
      <option value="yes">Ja</option>
      <option value="no">Nein</option>
      <option value="in_progress">In Beantragung</option>
    </select>
  );
}