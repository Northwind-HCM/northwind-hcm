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
  salaryType: "",
  monthlySalary: "",
  hourlyRate: "",
  currency: "EUR",
  validFrom: "",

  bonusEligible: "",
  bonusType: "",
  bonusAmount: "",
  bonusNotes: "",

  companyCar: "",
  carGrossListPrice: "",
  carFirstRegistration: "",
  carPrivateUse: "",
  carTaxationMethod: "",
  distanceHomeWorkKm: "",
  employeeCarContribution: "",
  fuelCard: "",

  benefits: "",
  jobTicket: "",
  jobBike: "",
  internetAllowance: "",
  childcareAllowance: "",
  mealAllowance: "",

  costCenter: "",
  costUnit: "",
  department: "",
  location: "",
  payrollStatus: "new",

  notes: "",
};

export default function EmployeePayrollDataForm({ companyId, employeeId }: Props) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPayrollData() {
      try {
        const ref = doc(
          db,
          "companies",
          companyId,
          "employees",
          employeeId,
          "payrollData",
          "current"
        );

        const snap = await getDoc(ref);

        if (snap.exists()) {
          setFormData({
            ...initialData,
            ...(snap.data() as Partial<typeof initialData>),
          });
        }
      } catch (error: any) {
        setMessage(`Fehler beim Laden: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadPayrollData();
  }, [companyId, employeeId]);

  function updateField(key: keyof typeof initialData, value: string) {
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
      await setDoc(
        doc(
          db,
          "companies",
          companyId,
          "employees",
          employeeId,
          "payrollData",
          "current"
        ),
        {
          ...formData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMessage("Payroll-Daten gespeichert ✅");
    } catch (error: any) {
      setMessage(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Lade Payroll-Daten...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl bg-white p-6 shadow">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Vergütung</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Vergütungsart" helper="Monatsgehalt oder Stundenlohn.">
            <select className={inputClass} value={formData.salaryType} onChange={(e) => updateField("salaryType", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="monthly_salary">Monatsgehalt</option>
              <option value="hourly_rate">Stundenlohn</option>
            </select>
          </FormField>

          <FormField label="Monatsgehalt" helper="Bruttomonatsgehalt in Euro.">
            <input className={inputClass} value={formData.monthlySalary} onChange={(e) => updateField("monthlySalary", e.target.value)} />
          </FormField>

          <FormField label="Stundenlohn" helper="Bruttostundenlohn in Euro.">
            <input className={inputClass} value={formData.hourlyRate} onChange={(e) => updateField("hourlyRate", e.target.value)} />
          </FormField>

          <FormField label="Währung">
            <input className={inputClass} value={formData.currency} onChange={(e) => updateField("currency", e.target.value)} />
          </FormField>

          <FormField label="Gültig ab" helper="Ab wann gelten diese Vergütungsdaten?">
            <input type="date" className={inputClass} value={formData.validFrom} onChange={(e) => updateField("validFrom", e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">2. Bonus / variable Vergütung</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Bonusberechtigt?">
            <select className={inputClass} value={formData.bonusEligible} onChange={(e) => updateField("bonusEligible", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </FormField>

          <FormField label="Bonusart" helper="z. B. Jahresbonus, Provision, Zielbonus.">
            <input className={inputClass} value={formData.bonusType} onChange={(e) => updateField("bonusType", e.target.value)} />
          </FormField>

          <FormField label="Bonusbetrag / Zielbetrag">
            <input className={inputClass} value={formData.bonusAmount} onChange={(e) => updateField("bonusAmount", e.target.value)} />
          </FormField>

          <FormField label="Hinweise Bonus">
            <input className={inputClass} value={formData.bonusNotes} onChange={(e) => updateField("bonusNotes", e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">3. Dienstwagen</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Dienstwagen vorhanden?">
            <select className={inputClass} value={formData.companyCar} onChange={(e) => updateField("companyCar", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </FormField>

          <FormField label="Bruttolistenpreis">
            <input className={inputClass} value={formData.carGrossListPrice} onChange={(e) => updateField("carGrossListPrice", e.target.value)} />
          </FormField>

          <FormField label="Erstzulassung">
            <input type="date" className={inputClass} value={formData.carFirstRegistration} onChange={(e) => updateField("carFirstRegistration", e.target.value)} />
          </FormField>

          <FormField label="Privatnutzung erlaubt?">
            <select className={inputClass} value={formData.carPrivateUse} onChange={(e) => updateField("carPrivateUse", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </FormField>

          <FormField label="Versteuerungsmethode">
            <select className={inputClass} value={formData.carTaxationMethod} onChange={(e) => updateField("carTaxationMethod", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="one_percent">1%-Regelung</option>
              <option value="logbook">Fahrtenbuch</option>
            </select>
          </FormField>

          <FormField label="Entfernung Wohnung–erste Tätigkeitsstätte (km)">
            <input className={inputClass} value={formData.distanceHomeWorkKm} onChange={(e) => updateField("distanceHomeWorkKm", e.target.value)} />
          </FormField>

          <FormField label="Zuzahlung Arbeitnehmer">
            <input className={inputClass} value={formData.employeeCarContribution} onChange={(e) => updateField("employeeCarContribution", e.target.value)} />
          </FormField>

          <FormField label="Tankkarte / Kraftstoffübernahme?">
            <select className={inputClass} value={formData.fuelCard} onChange={(e) => updateField("fuelCard", e.target.value)}>
              <option value="">Bitte auswählen</option>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </select>
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">4. Benefits</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Benefits allgemein" helper="Freitext für Sachbezüge oder sonstige Leistungen.">
            <input className={inputClass} value={formData.benefits} onChange={(e) => updateField("benefits", e.target.value)} />
          </FormField>

          <FormField label="Deutschlandticket / Jobticket">
            <input className={inputClass} value={formData.jobTicket} onChange={(e) => updateField("jobTicket", e.target.value)} />
          </FormField>

          <FormField label="JobRad">
            <input className={inputClass} value={formData.jobBike} onChange={(e) => updateField("jobBike", e.target.value)} />
          </FormField>

          <FormField label="Internetpauschale">
            <input className={inputClass} value={formData.internetAllowance} onChange={(e) => updateField("internetAllowance", e.target.value)} />
          </FormField>

          <FormField label="Kita-Zuschuss">
            <input className={inputClass} value={formData.childcareAllowance} onChange={(e) => updateField("childcareAllowance", e.target.value)} />
          </FormField>

          <FormField label="Essenszuschuss">
            <input className={inputClass} value={formData.mealAllowance} onChange={(e) => updateField("mealAllowance", e.target.value)} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">5. Organisation & Payroll Status</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Abteilung">
            <input className={inputClass} value={formData.department} onChange={(e) => updateField("department", e.target.value)} />
          </FormField>

          <FormField label="Standort">
            <input className={inputClass} value={formData.location} onChange={(e) => updateField("location", e.target.value)} />
          </FormField>

          <FormField label="Kostenstelle">
            <input className={inputClass} value={formData.costCenter} onChange={(e) => updateField("costCenter", e.target.value)} />
          </FormField>

          <FormField label="Kostenträger">
            <input className={inputClass} value={formData.costUnit} onChange={(e) => updateField("costUnit", e.target.value)} />
          </FormField>

          <FormField label="Payroll Status">
            <select className={inputClass} value={formData.payrollStatus} onChange={(e) => updateField("payrollStatus", e.target.value)}>
              <option value="new">Neu</option>
              <option value="review">In Prüfung</option>
              <option value="approved">Freigegeben</option>
              <option value="exported">Exportiert</option>
              <option value="processed">Abgerechnet</option>
            </select>
          </FormField>
        </div>
      </section>

      <FormField label="Interne Notizen" helper="Nicht sichtbar für Mitarbeiter.">
        <textarea
          className="min-h-28 w-full rounded border p-3"
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </FormField>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-900 px-6 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Speichert..." : "Payroll-Daten speichern"}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </div>
    </form>
  );
}