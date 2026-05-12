"use client";

import { useState } from "react";

export default function EarlyAccessPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    employees: "",
    interest: "HCM + Payroll",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  function updateField(key: keyof typeof formData, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");

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

      setStatus("Vielen Dank. Wir melden uns kurzfristig bei Ihnen.");
      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        employees: "",
        interest: "HCM + Payroll",
        message: "",
      });
    } catch (error) {
      console.error(error);
      setStatus("Fehler beim Senden der Anfrage.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-gray-900">
          Early Access anfragen
        </h1>

        <p className="mt-3 text-gray-600">
          Wir öffnen Northwind HCM aktuell für ausgewählte Unternehmen.
          Bitte senden Sie uns kurz Ihre Daten, damit wir den passenden Zugang
          vorbereiten können.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            className="w-full rounded-xl border p-3"
            placeholder="Firmenname"
            value={formData.companyName}
            onChange={(e) => updateField("companyName", e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Ansprechpartner"
            value={formData.contactName}
            onChange={(e) => updateField("contactName", e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border p-3"
            type="email"
            placeholder="E-Mail-Adresse"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
          />

          <input
            className="w-full rounded-xl border p-3"
            placeholder="Anzahl Mitarbeiter"
            value={formData.employees}
            onChange={(e) => updateField("employees", e.target.value)}
          />

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

          <textarea
            className="min-h-32 w-full rounded-xl border p-3"
            placeholder="Nachricht / gewünschter Start / Besonderheiten"
            value={formData.message}
            onChange={(e) => updateField("message", e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Sendet..." : "Early Access anfragen"}
          </button>

          {status && (
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              {status}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}