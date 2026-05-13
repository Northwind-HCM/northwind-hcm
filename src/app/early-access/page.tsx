"use client";

import { useState } from "react";
import Link from "next/link";

export default function EarlyAccessPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    employees: "",
    currentPayroll: "",
    interest: "HCM + Payroll",
    desiredStart: "",
    message: "",
    privacyAccepted: false,
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("");

  function updateField(
    key: keyof typeof formData,
    value: string | boolean
  ) {
    setFormData((prev) => ({ ...prev, [key]: value as never }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

    if (!formData.privacyAccepted) {
      setStatus("Bitte bestätigen Sie den Datenschutzhinweis.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Anfrage konnte nicht gesendet werden.");
        return;
      }

      setSubmitted(true);
      setStatus("Vielen Dank. Wir melden uns kurzfristig bei Ihnen.");

      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        employees: "",
        currentPayroll: "",
        interest: "HCM + Payroll",
        desiredStart: "",
        message: "",
        privacyAccepted: false,
      });
    } catch (error) {
      console.error(error);
      setStatus("Fehler beim Senden der Anfrage.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-900">
            Anfrage erhalten
          </p>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">
            Vielen Dank für Ihr Interesse.
          </h1>

          <p className="mt-4 text-gray-600">
            Ihre Early-Access-Anfrage wurde übermittelt. Wir prüfen die Angaben
            und melden uns kurzfristig persönlich bei Ihnen.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white"
            >
              Zur Startseite
            </Link>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-800"
            >
              Weitere Anfrage stellen
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-3xl bg-blue-900 p-8 text-white shadow">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
            Northwind HCM
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            Early Access für Payroll-ready HR Prozesse
          </h1>

          <p className="mt-5 text-blue-100">
            Wir öffnen Northwind HCM aktuell kontrolliert für ausgewählte
            Unternehmen. So stellen wir sicher, dass Setup, Payroll-Prozesse und
            Datenschutz sauber begleitet werden.
          </p>

          <div className="mt-8 space-y-4 text-sm text-blue-50">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="font-semibold">HCM Starter</p>
              <p>Digitale Stammdaten, ESS, Dokumente und Basis-Workflows.</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="font-semibold">HCM + Payroll</p>
              <p>
                Plattform kombiniert mit deutscher Payroll-Expertise von
                Northwind.
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4">
              <p className="font-semibold">Kontrolliertes Onboarding</p>
              <p>
                Kein offenes Self-Signup. Jeder Mandant wird vor Freischaltung
                geprüft.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-8 shadow">
          <h2 className="text-3xl font-bold text-gray-900">
            Early Access anfragen
          </h2>

          <p className="mt-3 text-gray-600">
            Bitte senden Sie uns kurz Ihre Daten. Wir melden uns persönlich und
            klären, ob Plattform, Payroll-Service oder die Kombination sinnvoll
            passt.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Firmenname" required>
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="Muster GmbH"
                  value={formData.companyName}
                  onChange={(e) =>
                    updateField("companyName", e.target.value)
                  }
                  required
                />
              </Field>

              <Field label="Ansprechpartner" required>
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="Max Mustermann"
                  value={formData.contactName}
                  onChange={(e) =>
                    updateField("contactName", e.target.value)
                  }
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="E-Mail-Adresse" required>
                <input
                  className="w-full rounded-xl border p-3"
                  type="email"
                  placeholder="name@firma.de"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                />
              </Field>

              <Field label="Telefon">
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="+49 ..."
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Anzahl Mitarbeiter">
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="z. B. 25"
                  value={formData.employees}
                  onChange={(e) => updateField("employees", e.target.value)}
                />
              </Field>

              <Field label="Gewünschter Start">
                <input
                  className="w-full rounded-xl border p-3"
                  placeholder="z. B. Juni 2026"
                  value={formData.desiredStart}
                  onChange={(e) =>
                    updateField("desiredStart", e.target.value)
                  }
                />
              </Field>
            </div>

            <Field label="Aktuelle Payroll-Situation">
              <select
                className="w-full rounded-xl border p-3"
                value={formData.currentPayroll}
                onChange={(e) =>
                  updateField("currentPayroll", e.target.value)
                }
              >
                <option value="">Bitte auswählen</option>
                <option>Payroll intern</option>
                <option>Payroll extern ausgelagert</option>
                <option>Steuerberater</option>
                <option>Noch kein Payroll-Prozess</option>
                <option>Sonstiges / unklar</option>
              </select>
            </Field>

            <Field label="Interesse">
              <select
                className="w-full rounded-xl border p-3"
                value={formData.interest}
                onChange={(e) => updateField("interest", e.target.value)}
              >
                <option>HCM Starter</option>
                <option>Payroll Service</option>
                <option>HCM + Payroll</option>
                <option>Noch unsicher</option>
              </select>
            </Field>

            <Field label="Nachricht">
              <textarea
                className="min-h-32 w-full rounded-xl border p-3"
                placeholder="Besonderheiten, gewünschter Start, aktuelle Herausforderungen..."
                value={formData.message}
                onChange={(e) => updateField("message", e.target.value)}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={formData.privacyAccepted}
                onChange={(e) =>
                  updateField("privacyAccepted", e.target.checked)
                }
                required
                className="mt-1"
              />
              <span>
                Ich bin damit einverstanden, dass meine Angaben zur Bearbeitung
                der Early-Access-Anfrage verarbeitet werden. Weitere
                Informationen finden Sie in der{" "}
                <Link
                  href="/datenschutz"
                  className="font-medium text-blue-900 underline"
                >
                  Datenschutzerklärung
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Sendet..." : "Early Access anfragen"}
            </button>

            {status && (
              <p
                className={`rounded-xl p-3 text-sm ${
                  status.includes("Vielen Dank")
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {status}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}