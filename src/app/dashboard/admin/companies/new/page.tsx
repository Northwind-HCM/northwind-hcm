"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const inputClass = "w-full rounded-xl border p-3";

export default function NewCompanyPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    legalForm: "",
    email: "",
    phone: "",
    street: "",
    zip: "",
    city: "",
    country: "Deutschland",
    status: "setup",
  });

  function updateField(key: keyof typeof formData, value: string) {
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
      const companyRef = await addDoc(collection(db, "companies"), {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      router.push(`/dashboard/admin/companies/${companyRef.id}`);
    } catch (error: any) {
      console.error(error);
      setMessage(`Mandant konnte nicht angelegt werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Mandant anlegen</h1>
        <p className="text-gray-600">
          Neue Firma kontrolliert für das Northwind Portal vorbereiten.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Firmenname" required>
            <input
              className={inputClass}
              value={formData.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              required
            />
          </Field>

          <Field label="Rechtsform">
            <input
              className={inputClass}
              value={formData.legalForm}
              onChange={(e) => updateField("legalForm", e.target.value)}
              placeholder="z. B. GmbH, UG, Ltd."
            />
          </Field>

          <Field label="E-Mail">
            <input
              type="email"
              className={inputClass}
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </Field>

          <Field label="Telefon">
            <input
              className={inputClass}
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </Field>

          <Field label="Straße">
            <input
              className={inputClass}
              value={formData.street}
              onChange={(e) => updateField("street", e.target.value)}
            />
          </Field>

          <Field label="PLZ">
            <input
              className={inputClass}
              value={formData.zip}
              onChange={(e) => updateField("zip", e.target.value)}
            />
          </Field>

          <Field label="Ort">
            <input
              className={inputClass}
              value={formData.city}
              onChange={(e) => updateField("city", e.target.value)}
            />
          </Field>

          <Field label="Land">
            <input
              className={inputClass}
              value={formData.country}
              onChange={(e) => updateField("country", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={formData.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="setup">Setup</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </Field>
        </div>

        {message && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Mandant anlegen"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/companies")}
            className="rounded-xl bg-gray-100 px-5 py-3 font-semibold text-gray-800"
          >
            Abbrechen
          </button>
        </div>
      </form>
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