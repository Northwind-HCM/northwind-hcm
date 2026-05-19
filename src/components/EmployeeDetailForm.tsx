"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import FormField from "@/components/FormField";

type Props = {
  companyId: string;
  employeeId: string;
  readOnly?: boolean;
};

type EmployeeOption = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

const inputClass = "w-full rounded border p-3 disabled:bg-gray-100";
const errorInputClass =
  "w-full rounded border border-red-500 bg-red-50 p-3 disabled:bg-gray-100";

const initialFormData = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  birthDate: "",
  birthName: "",
  birthPlace: "",
  birthCountry: "",
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

  taxId: "",
  taxClass: "",
  taxFactor: "",
  churchTax: "",
  spouseChurchTax: "",
  childAllowance: "",
  mainEmployer: "",

  socialSecurityNumber: "",
  healthInsurance: "",
  healthInsuranceCompanyNumber: "",
  statutoryHealthInsurance: "",
  voluntaryHealthInsurance: "",
  privateHealthInsurance: "",
  privateHealthInsuranceTotalKV: "",
  privateHealthInsuranceTotalPV: "",
  privateHealthInsuranceBaseKV: "",
  privateHealthInsuranceBasePV: "",
  hasChildrenForPV: "",

  employmentType: "",
  weeklyHours: "",
  weeklyHoursDistribution: "",
  annualVacationDays: "",

  salaryType: "",
  salaryAmount: "",
  salaryStartDate: "",

  otherEmployment: "",
  otherEmploymentIncome: "",
  miniJob: "",
  miniJobIncome: "",

  professionalEducation: "",
  schoolEducation: "",

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

  temporaryAgencyWork: "",
  seasonalWorker: "",
  departmentNumber: "",
  costCenter: "",
  costUnit: "",
  onlineDocuments: "",

  managerId: "",
  managerName: "",
  managerEmail: "",

  notes: "",
  confirmation: false,
};

type FormKey = keyof typeof initialFormData;

type TabKey =
  | "personal"
  | "address"
  | "employment"
  | "tax"
  | "social"
  | "salary"
  | "bank"
  | "benefits"
  | "organization"
  | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Persönlich" },
  { key: "address", label: "Adresse" },
  { key: "employment", label: "Beschäftigung" },
  { key: "tax", label: "Steuer" },
  { key: "social", label: "SV / Krankenkasse" },
  { key: "salary", label: "Vergütung" },
  { key: "bank", label: "Bank" },
  { key: "benefits", label: "VWL / bAV" },
  { key: "organization", label: "Organisation" },
  { key: "notes", label: "Notizen" },
];

function calculateCompleteness(data: typeof initialFormData) {
  const missing: string[] = [];

  if (!data.taxId) missing.push("Steuer-ID");
  if (!data.socialSecurityNumber) missing.push("Sozialversicherungsnummer");
  if (!data.healthInsurance) missing.push("Krankenkasse");
  if (!data.iban) missing.push("IBAN");
  if (!data.hasChildrenForPV) missing.push("Kinder/Pflegeversicherung");

  const hardMissing: string[] = [];

  if (!data.firstName) hardMissing.push("Vorname");
  if (!data.lastName) hardMissing.push("Nachname");
  if (!data.entryDate) hardMissing.push("Eintrittsdatum");
  if (!data.employmentType) hardMissing.push("Beschäftigungsart");

  let status = "complete";

  if (missing.length > 0) {
    status = "incomplete";
  }

  if (hardMissing.length > 0) {
    status = "draft";
  }

  return {
    status,
    missingFields: missing,
    hardMissingFields: hardMissing,
  };
}

export default function EmployeeDetailForm({
  companyId,
  employeeId,
  readOnly = false,
}: Props) {
  const [formData, setFormData] = useState(initialFormData);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const employeeRef = doc(
          db,
          "companies",
          companyId,
          "employees",
          employeeId
        );

        const employeeSnap = await getDoc(employeeRef);

        const employeesSnap = await getDocs(
          collection(db, "companies", companyId, "employees")
        );

        const employeeOptions = employeesSnap.docs.map((employeeDoc) => ({
          id: employeeDoc.id,
          ...(employeeDoc.data() as Omit<EmployeeOption, "id">),
        }));

        setEmployees(employeeOptions);

        if (employeeSnap.exists()) {
          setFormData({
            ...initialFormData,
            ...(employeeSnap.data() as Partial<typeof initialFormData>),
          });

          setHasUnsavedChanges(false);
        } else {
          setMessage("Mitarbeiter nicht gefunden ❌");
        }
      } catch (error: any) {
        console.error(error);
        setMessage("Fehler beim Laden ❌ " + error.message);
      } finally {
        setInitialLoading(false);
      }
    }

    loadEmployee();
  }, [companyId, employeeId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) return;
      if (anchor.target === "_blank") return;
      if (anchor.href === window.location.href) return;

      const confirmed = window.confirm(
        "Es gibt ungespeicherte Änderungen. Möchtest du die Seite wirklich verlassen?"
      );

      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function hasError(field: string) {
    return validationErrors.includes(field);
  }

  function updateField(key: FormKey, value: string | boolean) {
    if (readOnly) return;

    setFormData((prev) => ({
      ...prev,
      [key]: value as never,
    }));

    setHasUnsavedChanges(true);

    setValidationErrors((prev) => prev.filter((field) => field !== key));
  }

  function updateManager(selectedId: string) {
    if (readOnly) return;

    const manager = employees.find((employee) => employee.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      managerId: selectedId,
      managerName: manager
        ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim()
        : "",
      managerEmail: manager?.email || "",
    }));

    setHasUnsavedChanges(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (readOnly) {
      setMessage("Nur-Lesen-Modus: Änderungen sind nicht erlaubt.");
      return;
    }

    setSaving(true);
    setMessage("");

    const hardMissingFields: string[] = [];

    if (!formData.firstName) hardMissingFields.push("firstName");
    if (!formData.lastName) hardMissingFields.push("lastName");
    if (!formData.entryDate) hardMissingFields.push("entryDate");
    if (!formData.employmentType) hardMissingFields.push("employmentType");

    setValidationErrors(hardMissingFields);

    if (hardMissingFields.length > 0) {
      setMessage(
        "Bitte die zwingenden Pflichtfelder vervollständigen. Steuer-ID, SV-Nummer, Krankenkasse und IBAN können später nachgereicht werden."
      );

      if (
        hardMissingFields.includes("firstName") ||
        hardMissingFields.includes("lastName")
      ) {
        setActiveTab("personal");
      } else if (
        hardMissingFields.includes("entryDate") ||
        hardMissingFields.includes("employmentType")
      ) {
        setActiveTab("employment");
      }

      setSaving(false);
      return;
    }

    try {
      const completeness = calculateCompleteness(formData);

      await setDoc(
        doc(db, "companies", companyId, "employees", employeeId),
        {
          ...formData,
          status: completeness.status,
          missingFields: completeness.missingFields,
          hardMissingFields: completeness.hardMissingFields,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setValidationErrors([]);
      setHasUnsavedChanges(false);

      if (completeness.missingFields.length > 0) {
        setMessage(
          `Mitarbeiter gespeichert ✅ Noch offen für Payroll: ${completeness.missingFields.join(
            ", "
          )}`
        );
      } else {
        setMessage("Mitarbeiter erfolgreich gespeichert ✅");
      }
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Speichern ❌ ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) {
    return <p>Lade Mitarbeiterdaten...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`rounded-xl p-4 text-sm ${
            validationErrors.length > 0
              ? "bg-red-50 text-red-800"
              : "bg-green-50 text-green-800"
          }`}
        >
          {message}
        </div>
      )}

      {hasUnsavedChanges && !readOnly && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
          Es gibt ungespeicherte Änderungen. Bitte speichern, bevor du die Seite verlässt.
        </div>
      )}

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
            <Section title="Persönliche Daten">
              <TextField readOnly={readOnly} label="Personalnummer" value={formData.employeeNumber} onChange={(value) => updateField("employeeNumber", value)} />
              <TextField error={hasError("firstName")} readOnly={readOnly} label="Vorname" required value={formData.firstName} onChange={(value) => updateField("firstName", value)} />
              <TextField error={hasError("lastName")} readOnly={readOnly} label="Nachname" required value={formData.lastName} onChange={(value) => updateField("lastName", value)} />
              <TextField readOnly={readOnly} type="date" label="Geburtsdatum" value={formData.birthDate} onChange={(value) => updateField("birthDate", value)} />
              <TextField readOnly={readOnly} label="Geburtsname" value={formData.birthName} onChange={(value) => updateField("birthName", value)} />
              <TextField readOnly={readOnly} label="Geburtsort" value={formData.birthPlace} onChange={(value) => updateField("birthPlace", value)} />
              <TextField readOnly={readOnly} label="Geburtsland" value={formData.birthCountry} onChange={(value) => updateField("birthCountry", value)} />
              <TextField readOnly={readOnly} label="Nationalität" value={formData.nationality} onChange={(value) => updateField("nationality", value)} />

              <SelectField
                readOnly={readOnly}
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
            </Section>
          )}

          {activeTab === "address" && (
            <Section title="Adresse & Kontakt">
              <TextField readOnly={readOnly} label="Straße" value={formData.street} onChange={(value) => updateField("street", value)} />
              <TextField readOnly={readOnly} label="Hausnummer" value={formData.houseNumber} onChange={(value) => updateField("houseNumber", value)} />
              <TextField readOnly={readOnly} label="PLZ" value={formData.zip} onChange={(value) => updateField("zip", value)} />
              <TextField readOnly={readOnly} label="Ort" value={formData.city} onChange={(value) => updateField("city", value)} />
              <TextField readOnly={readOnly} label="Land" value={formData.country} onChange={(value) => updateField("country", value)} />
              <TextField readOnly={readOnly} type="email" label="E-Mail-Adresse" value={formData.email} onChange={(value) => updateField("email", value)} />
              <TextField readOnly={readOnly} label="Telefon" value={formData.phone} onChange={(value) => updateField("phone", value)} />
            </Section>
          )}

          {activeTab === "employment" && (
            <Section title="Beschäftigung">
              <TextField readOnly={readOnly} label="Berufsbezeichnung" value={formData.jobTitle} onChange={(value) => updateField("jobTitle", value)} />
              <TextField error={hasError("entryDate")} readOnly={readOnly} type="date" label="Eintrittsdatum" required value={formData.entryDate} onChange={(value) => updateField("entryDate", value)} />
              <TextField readOnly={readOnly} type="date" label="Austrittsdatum" value={formData.exitDate} onChange={(value) => updateField("exitDate", value)} />

              <SelectField readOnly={readOnly} label="Befristung" value={formData.fixedTerm} onChange={(value) => updateField("fixedTerm", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />

              <SelectField
                error={hasError("employmentType")}
                readOnly={readOnly}
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

              <TextField readOnly={readOnly} label="Wöchentliche Arbeitszeit" value={formData.weeklyHours} onChange={(value) => updateField("weeklyHours", value)} />
              <TextField readOnly={readOnly} label="Verteilung der Arbeitszeit" value={formData.weeklyHoursDistribution} onChange={(value) => updateField("weeklyHoursDistribution", value)} />
              <TextField readOnly={readOnly} label="Jahresurlaubsanspruch" value={formData.annualVacationDays} onChange={(value) => updateField("annualVacationDays", value)} />
            </Section>
          )}

          {activeTab === "tax" && (
            <Section title="Steuerdaten">
              <TextField readOnly={readOnly} label="Steuer-ID" value={formData.taxId} onChange={(value) => updateField("taxId", value)} />
              <SelectField readOnly={readOnly} label="Steuerklasse" value={formData.taxClass} onChange={(value) => updateField("taxClass", value)} options={[["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]]} />
              <TextField readOnly={readOnly} label="Faktor" value={formData.taxFactor} onChange={(value) => updateField("taxFactor", value)} />
              <TextField readOnly={readOnly} label="Konfession" value={formData.churchTax} onChange={(value) => updateField("churchTax", value)} />
              <TextField readOnly={readOnly} label="Konfession Ehegatte" value={formData.spouseChurchTax} onChange={(value) => updateField("spouseChurchTax", value)} />
              <TextField readOnly={readOnly} label="Kinderfreibetrag" value={formData.childAllowance} onChange={(value) => updateField("childAllowance", value)} />
              <SelectField readOnly={readOnly} label="Haupt-/Nebenarbeitgeber" value={formData.mainEmployer} onChange={(value) => updateField("mainEmployer", value)} options={[["main", "Hauptarbeitgeber"], ["secondary", "Nebenarbeitgeber"]]} />
            </Section>
          )}

          {activeTab === "social" && (
            <Section title="Sozialversicherung / Krankenkasse">
              <TextField readOnly={readOnly} label="Sozialversicherungsnummer" value={formData.socialSecurityNumber} onChange={(value) => updateField("socialSecurityNumber", value)} />
              <TextField readOnly={readOnly} label="Krankenkasse" value={formData.healthInsurance} onChange={(value) => updateField("healthInsurance", value)} />
              <TextField readOnly={readOnly} label="Betriebsnummer Krankenkasse" value={formData.healthInsuranceCompanyNumber} onChange={(value) => updateField("healthInsuranceCompanyNumber", value)} />
              <SelectField readOnly={readOnly} label="Gesetzlich versichert?" value={formData.statutoryHealthInsurance} onChange={(value) => updateField("statutoryHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <SelectField readOnly={readOnly} label="Freiwillig gesetzlich versichert?" value={formData.voluntaryHealthInsurance} onChange={(value) => updateField("voluntaryHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <SelectField readOnly={readOnly} label="Privat versichert?" value={formData.privateHealthInsurance} onChange={(value) => updateField("privateHealthInsurance", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField readOnly={readOnly} label="PKV Gesamtbeitrag KV" value={formData.privateHealthInsuranceTotalKV} onChange={(value) => updateField("privateHealthInsuranceTotalKV", value)} />
              <TextField readOnly={readOnly} label="PKV Gesamtbeitrag PV" value={formData.privateHealthInsuranceTotalPV} onChange={(value) => updateField("privateHealthInsuranceTotalPV", value)} />
              <SelectField readOnly={readOnly} label="Kinder für Pflegeversicherung" value={formData.hasChildrenForPV} onChange={(value) => updateField("hasChildrenForPV", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
            </Section>
          )}

          {activeTab === "salary" && (
            <Section title="Vergütung">
              <SelectField readOnly={readOnly} label="Vergütungsart" value={formData.salaryType} onChange={(value) => updateField("salaryType", value)} options={[["monthly_salary", "Monatsgehalt"], ["hourly_rate", "Stundenlohn"]]} />
              <TextField readOnly={readOnly} label="Betrag" value={formData.salaryAmount} onChange={(value) => updateField("salaryAmount", value)} />
              <TextField readOnly={readOnly} type="date" label="Gültig ab" value={formData.salaryStartDate} onChange={(value) => updateField("salaryStartDate", value)} />
              <SelectField readOnly={readOnly} label="Weitere Beschäftigung?" value={formData.otherEmployment} onChange={(value) => updateField("otherEmployment", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField readOnly={readOnly} label="Einkommen weitere Beschäftigung" value={formData.otherEmploymentIncome} onChange={(value) => updateField("otherEmploymentIncome", value)} />
              <SelectField readOnly={readOnly} label="Minijob?" value={formData.miniJob} onChange={(value) => updateField("miniJob", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField readOnly={readOnly} label="Minijob-Einkommen" value={formData.miniJobIncome} onChange={(value) => updateField("miniJobIncome", value)} />
            </Section>
          )}

          {activeTab === "bank" && (
            <Section title="Bankdaten">
              <TextField readOnly={readOnly} label="IBAN" value={formData.iban} onChange={(value) => updateField("iban", value)} />
              <TextField readOnly={readOnly} label="BIC" value={formData.bic} onChange={(value) => updateField("bic", value)} />
              <TextField readOnly={readOnly} label="Bank" value={formData.bank} onChange={(value) => updateField("bank", value)} />
            </Section>
          )}

          {activeTab === "benefits" && (
            <Section title="VWL / Betriebliche Altersversorgung">
              <TextField readOnly={readOnly} label="VWL Anbieter" value={formData.vwlProvider} onChange={(value) => updateField("vwlProvider", value)} />
              <TextField readOnly={readOnly} label="VWL Vertragsnummer" value={formData.vwlContractNumber} onChange={(value) => updateField("vwlContractNumber", value)} />
              <TextField readOnly={readOnly} label="VWL Betrag" value={formData.vwlAmount} onChange={(value) => updateField("vwlAmount", value)} />
              <TextField readOnly={readOnly} label="VWL Arbeitgeberzuschuss" value={formData.vwlEmployerSubsidy} onChange={(value) => updateField("vwlEmployerSubsidy", value)} />
              <TextField readOnly={readOnly} type="date" label="VWL Startdatum" value={formData.vwlStartDate} onChange={(value) => updateField("vwlStartDate", value)} />
              <TextField readOnly={readOnly} label="VWL IBAN" value={formData.vwlIban} onChange={(value) => updateField("vwlIban", value)} />
              <TextField readOnly={readOnly} label="VWL BIC" value={formData.vwlBic} onChange={(value) => updateField("vwlBic", value)} />

              <TextField readOnly={readOnly} label="bAV Anbieter" value={formData.pensionProvider} onChange={(value) => updateField("pensionProvider", value)} />
              <TextField readOnly={readOnly} label="bAV Vertragsnummer" value={formData.pensionContractNumber} onChange={(value) => updateField("pensionContractNumber", value)} />
              <TextField readOnly={readOnly} label="bAV Betrag" value={formData.pensionAmount} onChange={(value) => updateField("pensionAmount", value)} />
              <TextField readOnly={readOnly} label="bAV Arbeitgeberzuschuss" value={formData.pensionEmployerSubsidy} onChange={(value) => updateField("pensionEmployerSubsidy", value)} />
              <TextField readOnly={readOnly} type="date" label="bAV Startdatum" value={formData.pensionStartDate} onChange={(value) => updateField("pensionStartDate", value)} />
              <TextField readOnly={readOnly} label="bAV IBAN" value={formData.pensionIban} onChange={(value) => updateField("pensionIban", value)} />
              <TextField readOnly={readOnly} label="bAV BIC" value={formData.pensionBic} onChange={(value) => updateField("pensionBic", value)} />
            </Section>
          )}

          {activeTab === "organization" && (
            <Section title="Organisation / Kostenstellen">
              <TextField readOnly={readOnly} label="Abteilungsnummer" value={formData.departmentNumber} onChange={(value) => updateField("departmentNumber", value)} />
              <TextField readOnly={readOnly} label="Kostenstelle" value={formData.costCenter} onChange={(value) => updateField("costCenter", value)} />
              <TextField readOnly={readOnly} label="Kostenträger" value={formData.costUnit} onChange={(value) => updateField("costUnit", value)} />

              <FormField label="Vorgesetzter">
                <select
                  disabled={readOnly}
                  className={inputClass}
                  value={formData.managerId}
                  onChange={(e) => updateManager(e.target.value)}
                >
                  <option value="">Bitte auswählen</option>
                  {employees
                    .filter((employee) => employee.id !== employeeId)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </option>
                    ))}
                </select>
              </FormField>

              {formData.managerName && (
                <div className="rounded border bg-gray-50 p-3 text-sm text-gray-700">
                  Aktueller Vorgesetzter: {formData.managerName}
                  {formData.managerEmail ? ` · ${formData.managerEmail}` : ""}
                </div>
              )}

              <SelectField readOnly={readOnly} label="Arbeitnehmerüberlassung?" value={formData.temporaryAgencyWork} onChange={(value) => updateField("temporaryAgencyWork", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <SelectField readOnly={readOnly} label="Saisonarbeitnehmer?" value={formData.seasonalWorker} onChange={(value) => updateField("seasonalWorker", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
              <TextField readOnly={readOnly} label="Berufsausbildung" value={formData.professionalEducation} onChange={(value) => updateField("professionalEducation", value)} />
              <TextField readOnly={readOnly} label="Schulbildung" value={formData.schoolEducation} onChange={(value) => updateField("schoolEducation", value)} />
              <SelectField readOnly={readOnly} label="Online-Dokumente gewünscht?" value={formData.onlineDocuments} onChange={(value) => updateField("onlineDocuments", value)} options={[["yes", "Ja"], ["no", "Nein"]]} />
            </Section>
          )}

          {activeTab === "notes" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Hinweise / Bestätigung</h2>

              <FormField label="Notizen" helper="Besonderheiten oder Hinweise zur Abrechnung.">
                <textarea disabled={readOnly} className="min-h-40 w-full rounded border p-3 disabled:bg-gray-100" value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} />
              </FormField>

              <label className="flex items-start gap-3 rounded border p-4">
                <input disabled={readOnly} type="checkbox" checked={formData.confirmation} onChange={(e) => updateField("confirmation", e.target.checked)} />
                <span className="text-sm">
                  Ich bestätige, dass die Angaben vollständig und korrekt sind und Änderungen unverzüglich mitgeteilt werden.
                </span>
              </label>
            </section>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow">
        {!readOnly && (
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Speichern"}
          </button>
        )}

        {readOnly && <p className="text-sm text-gray-600">Nur-Lesen-Modus</p>}
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
  readOnly,
  required = false,
  type = "text",
  error = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  required?: boolean;
  type?: string;
  error?: boolean;
}) {
  return (
    <FormField label={label} required={required}>
      <input
        type={type}
        disabled={readOnly}
        className={error ? errorInputClass : inputClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="mt-1 text-xs text-red-600">Pflichtfeld</p>}
    </FormField>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  readOnly,
  required = false,
  error = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  readOnly: boolean;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <FormField label={label} required={required}>
      <select
        disabled={readOnly}
        className={error ? errorInputClass : inputClass}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Bitte auswählen</option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">Pflichtfeld</p>}
    </FormField>
  );
}