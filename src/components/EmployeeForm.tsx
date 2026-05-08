"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FormField from "@/components/FormField";

type Props = {
  companyId: string;
};

const inputClass = "w-full rounded border p-3";

const initialFormData = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  nationality: "",
  gender: "",

  street: "",
  houseNumber: "",
  zip: "",
  city: "",
  country: "",
  email: "",
  phone: "",

  iban: "",
  bic: "",
  bank: "",

  jobTitle: "",
  entryDate: "",
  exitDate: "",
  fixedTerm: "",
  disability: "",
  disabilityDegree: "",

  employmentType: "",
  weeklyHours: "",
  weeklyHoursDistribution: "",
  annualVacationDays: "",

  salaryType: "",
  salaryAmount: "",
  salaryStartDate: "",

  taxId: "",
  taxClass: "",
  taxFactor: "",
  churchTax: "",
  spouseChurchTax: "",
  childAllowance: "",
  mainEmployer: "",

  socialSecurityNumber: "",
  healthInsurance: "",
  statutoryHealthInsurance: "",
  voluntaryHealthInsurance: "",
  privateHealthInsurance: "",
  privateHealthInsuranceTotalKV: "",
  privateHealthInsuranceTotalPV: "",
  privateHealthInsuranceBaseKV: "",
  privateHealthInsuranceBasePV: "",
  hasChildrenForPV: "",

  otherEmployment: "",
  otherEmploymentIncome: "",
  miniJob: "",
  miniJobIncome: "",

  vwlProvider: "",
  vwlContractNumber: "",
  vwlAmount: "",
  vwlEmployerSubsidy: "",
  vwlStartDate: "",
  vwlIban: "",
  vwlBic: "",

  pensionProvider: "",
  pensionContractNumber: "",
  pensionAmount: "",
  pensionEmployerSubsidy: "",
  pensionStartDate: "",
  pensionIban: "",
  pensionBic: "",

  professionalEducation: "",
  schoolEducation: "",
  temporaryAgencyWork: "",
  seasonalWorker: "",
  departmentNumber: "",
  costCenter: "",
  costUnit: "",
  onlineDocuments: "",

  notes: "",
  confirmation: false,
};

type FormKey = keyof typeof initialFormData;

type TabKey =
  | "personal"
  | "employment"
  | "tax"
  | "social"
  | "organization";

const tabs: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Persönlich" },
  { key: "employment", label: "Beschäftigung & Vergütung" },
  { key: "tax", label: "Steuer" },
  { key: "social", label: "SV / Krankenkasse" },
  { key: "organization", label: "Organisation & Notizen" },
];

function calculateCompleteness(data: typeof initialFormData) {
  const missing: string[] = [];

  if (!data.firstName) missing.push("Vorname");
  if (!data.lastName) missing.push("Nachname");
  if (!data.entryDate) missing.push("Eintrittsdatum");
  if (!data.employmentType) missing.push("Beschäftigungsart");
  if (!data.taxId) missing.push("Steuer-ID");
  if (!data.socialSecurityNumber) missing.push("Sozialversicherungsnummer");
  if (!data.healthInsurance) missing.push("Krankenkasse");
  if (!data.iban) missing.push("IBAN");
  if (!data.hasChildrenForPV) missing.push("Kinder/Pflegeversicherung");

  let status = "complete";

  if (missing.length > 0) status = "incomplete";

  if (!data.firstName || !data.lastName || !data.entryDate || !data.employmentType) {
    status = "draft";
  }

  return { status, missingFields: missing };
}

export default function EmployeeForm({ companyId }: Props) {
  const [formData, setFormData] = useState(initialFormData);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateField(key: FormKey, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [key]: value as never }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const completeness = calculateCompleteness(formData);

      const docRef = await addDoc(
        collection(db, "companies", companyId, "employees"),
        {
          ...formData,
          status: completeness.status,
          missingFields: completeness.missingFields,
          inviteStatus: "not_invited",
          createdAt: serverTimestamp(),
          updatedAt: new Date().toISOString(),
        }
      );

      setMessage(
        completeness.status === "complete"
          ? `Mitarbeiter vollständig gespeichert ✅ ID: ${docRef.id}`
          : `Gespeichert ⚠️ Fehlend: ${completeness.missingFields.join(", ")}`
      );
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Speichern ❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function goToNextTab() {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    const nextTab = tabs[currentIndex + 1];

    if (nextTab) {
      setActiveTab(nextTab.key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToPreviousTab() {
    const currentIndex = tabs.findIndex((tab) => tab.key === activeTab);
    const previousTab = tabs[currentIndex - 1];

    if (previousTab) {
      setActiveTab(previousTab.key);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const currentTabIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

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
          {activeTab === "personal" && (
            <Section title="Persönliche Daten, Adresse & Bank">
              <TextField label="Personalnummer" value={formData.employeeNumber} onChange={(value) => updateField("employeeNumber", value)} />
              <TextField label="Vorname" required value={formData.firstName} onChange={(value) => updateField("firstName", value)} />
              <TextField label="Nachname" required value={formData.lastName} onChange={(value) => updateField("lastName", value)} />
              <TextField type="date" label="Geburtsdatum" value={formData.birthDate} onChange={(value) => updateField("birthDate", value)} />
              <TextField label="Nationalität" value={formData.nationality} onChange={(value) => updateField("nationality", value)} />

              <SelectField
                label="Geschlecht"
                value={formData.gender}
                onChange={(value) => updateField("gender", value)}
                options={[
                  ["female", "Weiblich"],
                  ["male", "Männlich"],
                  ["diverse", "Divers"],
                  ["unknown", "Unbestimmt"],
                ]}
              />

              <TextField label="Straße" value={formData.street} onChange={(value) => updateField("street", value)} />
              <TextField label="Hausnummer" value={formData.houseNumber} onChange={(value) => updateField("houseNumber", value)} />
              <TextField label="PLZ" value={formData.zip} onChange={(value) => updateField("zip", value)} />
              <TextField label="Ort" value={formData.city} onChange={(value) => updateField("city", value)} />
              <TextField label="Land" value={formData.country} onChange={(value) => updateField("country", value)} />
              <TextField type="email" label="E-Mail-Adresse" value={formData.email} onChange={(value) => updateField("email", value)} />
              <TextField label="Telefon" value={formData.phone} onChange={(value) => updateField("phone", value)} />

              <TextField label="IBAN" value={formData.iban} onChange={(value) => updateField("iban", value)} />
              <TextField label="BIC" value={formData.bic} onChange={(value) => updateField("bic", value)} />
              <TextField label="Bank" value={formData.bank} onChange={(value) => updateField("bank", value)} />
            </Section>
          )}

          {activeTab === "employment" && (
            <Section title="Beschäftigung, Vergütung & Benefits">
              <TextField label="Berufsbezeichnung" value={formData.jobTitle} onChange={(value) => updateField("jobTitle", value)} />
              <TextField type="date" label="Eintrittsdatum" required value={formData.entryDate} onChange={(value) => updateField("entryDate", value)} />
              <TextField type="date" label="Austrittsdatum" value={formData.exitDate} onChange={(value) => updateField("exitDate", value)} />

              <SelectField label="Befristung" value={formData.fixedTerm} onChange={(value) => updateField("fixedTerm", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />

              <SelectField
                label="Beschäftigungsart"
                required
                value={formData.employmentType}
                onChange={(value) => updateField("employmentType", value)}
                options={[
                  ["full_time", "Vollzeit"],
                  ["part_time", "Teilzeit"],
                  ["mini_job", "Minijob"],
                  ["working_student", "Werkstudent"],
                  ["managing_director", "Geschäftsführer"],
                  ["other", "Sonstige"],
                ]}
              />

              <TextField label="Wöchentliche Arbeitszeit" value={formData.weeklyHours} onChange={(value) => updateField("weeklyHours", value)} />
              <TextField label="Verteilung der Arbeitszeit" value={formData.weeklyHoursDistribution} onChange={(value) => updateField("weeklyHoursDistribution", value)} />
              <TextField label="Jahresurlaubsanspruch" value={formData.annualVacationDays} onChange={(value) => updateField("annualVacationDays", value)} />

              <SelectField label="Schwerbehinderung" value={formData.disability} onChange={(value) => updateField("disability", value)} options={[["no", "Nein"], ["yes", "Ja"]]} />
              <TextField label="Grad der Behinderung" value={formData.disabilityDegree} onChange={(value) => updateField("disabilityDegree", value)} />

              <SelectField label="Vergütungsart" value={formData.salaryType} onChange={(value) => updateField("salaryType", value)} options={[["monthly_salary", "Monatsgehalt"], ["hourly_rate", "Stundenlohn"]]} />
              <TextField label="Betrag" value={formData.salaryAmount} onChange={(value) => updateField("salaryAmount", value)} />
              <TextField type="date" label="Gültig ab" value={formData.salaryStartDate} onChange={(value) => updateField("salaryStartDate", value)} />

              <SelectField label="Weitere Beschäftigung?" value={formData.otherEmployment} onChange={(value) => updateField("otherEmployment", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField label="Einkommen weitere Beschäftigung" value={formData.otherEmploymentIncome} onChange={(value) => updateField("otherEmploymentIncome", value)} />

              <SelectField label="Minijob?" value={formData.miniJob} onChange={(value) => updateField("miniJob", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField label="Minijob-Einkommen" value={formData.miniJobIncome} onChange={(value) => updateField("miniJobIncome", value)} />

              <TextField label="VWL Anbieter" value={formData.vwlProvider} onChange={(value) => updateField("vwlProvider", value)} />
              <TextField label="VWL Vertragsnummer" value={formData.vwlContractNumber} onChange={(value) => updateField("vwlContractNumber", value)} />
              <TextField label="VWL Betrag" value={formData.vwlAmount} onChange={(value) => updateField("vwlAmount", value)} />
              <TextField label="VWL Arbeitgeberzuschuss" value={formData.vwlEmployerSubsidy} onChange={(value) => updateField("vwlEmployerSubsidy", value)} />
              <TextField type="date" label="VWL Startdatum" value={formData.vwlStartDate} onChange={(value) => updateField("vwlStartDate", value)} />

              <TextField label="Direktversicherung Anbieter" value={formData.pensionProvider} onChange={(value) => updateField("pensionProvider", value)} />
              <TextField label="Direktversicherung Vertragsnummer" value={formData.pensionContractNumber} onChange={(value) => updateField("pensionContractNumber", value)} />
              <TextField label="Direktversicherung Betrag" value={formData.pensionAmount} onChange={(value) => updateField("pensionAmount", value)} />
              <TextField label="Direktversicherung Zuschuss" value={formData.pensionEmployerSubsidy} onChange={(value) => updateField("pensionEmployerSubsidy", value)} />
              <TextField type="date" label="Direktversicherung Startdatum" value={formData.pensionStartDate} onChange={(value) => updateField("pensionStartDate", value)} />
            </Section>
          )}

          {activeTab === "tax" && (
            <Section title="Steuerdaten">
              <TextField label="Steuer-ID" value={formData.taxId} onChange={(value) => updateField("taxId", value)} />

              <SelectField
                label="Steuerklasse"
                value={formData.taxClass}
                onChange={(value) => updateField("taxClass", value)}
                options={[
                  ["1", "1"],
                  ["2", "2"],
                  ["3", "3"],
                  ["4", "4"],
                  ["5", "5"],
                  ["6", "6"],
                ]}
              />

              <TextField label="Faktor" value={formData.taxFactor} onChange={(value) => updateField("taxFactor", value)} />
              <TextField label="Konfession" value={formData.churchTax} onChange={(value) => updateField("churchTax", value)} />
              <TextField label="Konfession Ehegatte" value={formData.spouseChurchTax} onChange={(value) => updateField("spouseChurchTax", value)} />
              <TextField label="Kinderfreibetrag" value={formData.childAllowance} onChange={(value) => updateField("childAllowance", value)} />

              <SelectField label="Haupt-/Nebenarbeitgeber" value={formData.mainEmployer} onChange={(value) => updateField("mainEmployer", value)} options={[["main", "Hauptarbeitgeber"], ["secondary", "Nebenarbeitgeber"]]} />
            </Section>
          )}

          {activeTab === "social" && (
            <Section title="Sozialversicherung / Krankenkasse">
              <TextField label="Sozialversicherungsnummer" value={formData.socialSecurityNumber} onChange={(value) => updateField("socialSecurityNumber", value)} />
              <TextField label="Krankenkasse" value={formData.healthInsurance} onChange={(value) => updateField("healthInsurance", value)} />
              
              <SelectField label="Gesetzlich versichert?" value={formData.statutoryHealthInsurance} onChange={(value) => updateField("statutoryHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <SelectField label="Freiwillig gesetzlich versichert?" value={formData.voluntaryHealthInsurance} onChange={(value) => updateField("voluntaryHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <SelectField label="Privat versichert?" value={formData.privateHealthInsurance} onChange={(value) => updateField("privateHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />

              <TextField label="PKV Gesamtbeitrag KV" value={formData.privateHealthInsuranceTotalKV} onChange={(value) => updateField("privateHealthInsuranceTotalKV", value)} />
              <TextField label="PKV Gesamtbeitrag PV" value={formData.privateHealthInsuranceTotalPV} onChange={(value) => updateField("privateHealthInsuranceTotalPV", value)} />
              <TextField label="PKV Basisbeitrag KV" value={formData.privateHealthInsuranceBaseKV} onChange={(value) => updateField("privateHealthInsuranceBaseKV", value)} />
              <TextField label="PKV Basisbeitrag PV" value={formData.privateHealthInsuranceBasePV} onChange={(value) => updateField("privateHealthInsuranceBasePV", value)} />

              <SelectField label="Kinder für Pflegeversicherung" value={formData.hasChildrenForPV} onChange={(value) => updateField("hasChildrenForPV", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
            </Section>
          )}

          {activeTab === "organization" && (
            <section className="space-y-6">
              <Section title="Organisation">
                <SelectField label="Arbeitnehmerüberlassung / Zeitarbeit" value={formData.temporaryAgencyWork} onChange={(value) => updateField("temporaryAgencyWork", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
                <SelectField label="Saisonarbeitnehmer" value={formData.seasonalWorker} onChange={(value) => updateField("seasonalWorker", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
                <TextField label="Abteilungsnummer" value={formData.departmentNumber} onChange={(value) => updateField("departmentNumber", value)} />
                <TextField label="Kostenstelle" value={formData.costCenter} onChange={(value) => updateField("costCenter", value)} />
                <TextField label="Kostenträger" value={formData.costUnit} onChange={(value) => updateField("costUnit", value)} />
                <SelectField label="Online-Dokumente gewünscht?" value={formData.onlineDocuments} onChange={(value) => updateField("onlineDocuments", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
                <TextField label="Berufsausbildung" value={formData.professionalEducation} onChange={(value) => updateField("professionalEducation", value)} />
                <TextField label="Schulbildung" value={formData.schoolEducation} onChange={(value) => updateField("schoolEducation", value)} />
              </Section>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Hinweise / Bestätigung</h2>

                <FormField label="Notizen" helper="Besonderheiten oder Hinweise zur Abrechnung.">
                  <textarea className="min-h-40 w-full rounded border p-3" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} />
                </FormField>

                <label className="flex items-start gap-3 rounded border p-4">
                  <input type="checkbox" checked={formData.confirmation} onChange={(e) => updateField("confirmation", e.target.checked)} />
                  <span className="text-sm">
                    Ich bestätige, dass die Angaben vollständig und korrekt sind und Änderungen unverzüglich mitgeteilt werden.
                  </span>
                </label>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow">
        <div className="flex gap-2">
          <button type="button" disabled={isFirstTab} onClick={goToPreviousTab} className="rounded-xl border px-5 py-3 font-medium disabled:opacity-40">
            Zurück
          </button>

          {!isLastTab && (
            <button type="button" onClick={goToNextTab} className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white">
              Weiter
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={loading} className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white disabled:opacity-50">
            {loading ? "Speichert..." : "Mitarbeiter speichern"}
          </button>

          {message && <p className="text-sm text-gray-700">{message}</p>}
        </div>
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

function TextField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <FormField label={label} required={required}>
      <input type={type} className={inputClass} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  required?: boolean;
}) {
  return (
    <FormField label={label} required={required}>
      <select className={inputClass} value={value} required={required} onChange={(e) => onChange(e.target.value)}>
        <option value="">Bitte auswählen</option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </FormField>
  );
}