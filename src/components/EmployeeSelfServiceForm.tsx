"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import FormField from "./FormField";

type Props = {
  companyId: string;
  employeeId: string;
};

const inputClass = "w-full rounded border p-3";

const initialData = {
  firstName: "",
  lastName: "",
  birthDate: "",
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

  taxId: "",
  socialSecurityNumber: "",
  healthInsurance: "",
  statutoryHealthInsurance: "",
  privateHealthInsurance: "",
  hasChildrenForPV: "",

  iban: "",
  bic: "",
  bank: "",

  notes: "",
};

type FormKey = keyof typeof initialData;

type TabKey =
  | "personal"
  | "taxSocial"
  | "bank"
  | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "personal", label: "Meine Daten" },
  { key: "taxSocial", label: "Steuer & Sozialversicherung" },
  { key: "bank", label: "Bank" },
  { key: "notes", label: "Hinweise" },
];

function calculateCompleteness(data: typeof initialData) {
  const missing: string[] = [];

  if (!data.firstName) missing.push("Vorname");
  if (!data.lastName) missing.push("Nachname");
  if (!data.taxId) missing.push("Steuer-ID");
  if (!data.socialSecurityNumber) missing.push("Sozialversicherungsnummer");
  if (!data.healthInsurance) missing.push("Krankenkasse");
  if (!data.iban) missing.push("IBAN");
  if (!data.hasChildrenForPV) missing.push("Kinder/Pflegeversicherung");

  return {
    status: missing.length === 0 ? "complete" : "incomplete",
    missingFields: missing,
  };
}

export default function EmployeeSelfServiceForm({
  companyId,
  employeeId,
}: Props) {
  const [formData, setFormData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<TabKey>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadEmployee() {
      try {
        const ref = doc(db, "companies", companyId, "employees", employeeId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setFormData({
            ...initialData,
            ...(snap.data() as Partial<typeof initialData>),
          });
        }
      } catch (error: any) {
        console.error(error);
        setMessage(`Fehler beim Laden: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadEmployee();
  }, [companyId, employeeId]);

  function updateField(key: FormKey, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const completeness = calculateCompleteness(formData);

      await setDoc(
        doc(db, "companies", companyId, "employees", employeeId),
        {
          ...formData,
          status: completeness.status,
          missingFields: completeness.missingFields,
          employeeUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMessage(
        completeness.status === "complete"
          ? "Ihre Daten wurden vollständig gespeichert ✅"
          : `Gespeichert ⚠️ Noch fehlend: ${completeness.missingFields.join(", ")}`
      );
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
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

  if (loading) {
    return <p>Lade Ihre Daten...</p>;
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
          {activeTab === "personal" && (
            <Section title="Meine Daten">
              <TextField label="Vorname" value={formData.firstName} onChange={(value) => updateField("firstName", value)} />
              <TextField label="Nachname" value={formData.lastName} onChange={(value) => updateField("lastName", value)} />
              <TextField type="date" label="Geburtsdatum" value={formData.birthDate} onChange={(value) => updateField("birthDate", value)} />
              <TextField label="Geburtsort" value={formData.birthPlace} onChange={(value) => updateField("birthPlace", value)} />
              <TextField label="Geburtsland" value={formData.birthCountry} onChange={(value) => updateField("birthCountry", value)} />
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
              <TextField type="email" label="E-Mail" value={formData.email} onChange={(value) => updateField("email", value)} />
              <TextField label="Telefon" value={formData.phone} onChange={(value) => updateField("phone", value)} />
            </Section>
          )}

          {activeTab === "taxSocial" && (
            <Section title="Steuer & Sozialversicherung">
              <TextField label="Steuer-ID" value={formData.taxId} onChange={(value) => updateField("taxId", value)} />
              <TextField label="Sozialversicherungsnummer" value={formData.socialSecurityNumber} onChange={(value) => updateField("socialSecurityNumber", value)} />
              <TextField label="Krankenkasse" value={formData.healthInsurance} onChange={(value) => updateField("healthInsurance", value)} />

              <SelectField
                label="Gesetzlich krankenversichert"
                value={formData.statutoryHealthInsurance}
                onChange={(value) => updateField("statutoryHealthInsurance", value)}
                options={[
                  ["yes", "Ja"],
                  ["no", "Nein"],
                ]}
              />

              <SelectField
                label="Privat krankenversichert"
                value={formData.privateHealthInsurance}
                onChange={(value) => updateField("privateHealthInsurance", value)}
                options={[
                  ["yes", "Ja"],
                  ["no", "Nein"],
                ]}
              />

              <SelectField
                label="Kinder für Pflegeversicherung"
                value={formData.hasChildrenForPV}
                onChange={(value) => updateField("hasChildrenForPV", value)}
                options={[
                  ["yes", "Ja"],
                  ["no", "Nein"],
                ]}
              />
            </Section>
          )}

          {activeTab === "bank" && (
            <Section title="Bankdaten">
              <TextField label="IBAN" value={formData.iban} onChange={(value) => updateField("iban", value)} />
              <TextField label="BIC" value={formData.bic} onChange={(value) => updateField("bic", value)} />
              <TextField label="Bank" value={formData.bank} onChange={(value) => updateField("bank", value)} />
            </Section>
          )}

          {activeTab === "notes" && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Hinweise</h2>

              <FormField label="Hinweise" helper="Optional: Ergänzen Sie Hinweise oder Besonderheiten.">
                <textarea
                  className="min-h-40 w-full rounded border p-3"
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                />
              </FormField>
            </section>
          )}
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isFirstTab}
            onClick={goToPreviousTab}
            className="rounded-xl border px-5 py-3 font-medium disabled:opacity-40"
          >
            Zurück
          </button>

          {!isLastTab && (
            <button
              type="button"
              onClick={goToNextTab}
              className="rounded-xl bg-gray-900 px-5 py-3 font-medium text-white"
            >
              Weiter
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Daten speichern"}
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
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <FormField label={label}>
      <input
        type={type}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <FormField label={label}>
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
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