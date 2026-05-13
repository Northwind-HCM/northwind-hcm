"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

const inputClass = "w-full rounded-xl border p-3";

const roles = [
  { value: "client_admin", label: "Mandanten Admin" },
  { value: "client_hr_admin", label: "HR Admin" },
  { value: "team_lead", label: "Team Lead" },
  { value: "employee", label: "Mitarbeiter" },
];

export default function NewCompanyUserPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String(params.companyId);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    displayName: "",
    role: "client_admin",
    employeeId: "",
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
      const response = await fetch("/api/admin/create-company-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          email: formData.email,
          displayName: formData.displayName,
          role: formData.role,
          employeeId: formData.employeeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Benutzer konnte nicht erstellt werden.");
        return;
      }

      router.push(`/dashboard/admin/companies/${companyId}`);
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Benutzer konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Benutzer einladen</h1>
          <p className="text-gray-600">
            Benutzer für diesen Mandanten erstellen, Rolle zuordnen und
            Einladung per E-Mail versenden.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Mandanten-ID: {companyId}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/dashboard/admin/companies/${companyId}`)}
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200"
        >
          Zurück
        </button>
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
        <p className="font-semibold">Hinweis</p>
        <p className="mt-1">
          Der Benutzer wird automatisch in Firebase Authentication angelegt,
          dem Mandanten zugeordnet und erhält eine E-Mail zum Festlegen des
          Passworts.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-6 shadow"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="E-Mail" required>
            <input
              type="email"
              className={inputClass}
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="name@firma.de"
              required
            />
          </Field>

          <Field label="Name">
            <input
              className={inputClass}
              value={formData.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              placeholder="Max Mustermann"
            />
          </Field>

          <Field label="Rolle" required>
            <select
              className={inputClass}
              value={formData.role}
              onChange={(e) => updateField("role", e.target.value)}
              required
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee ID">
            <input
              className={inputClass}
              value={formData.employeeId}
              onChange={(e) => updateField("employeeId", e.target.value)}
              placeholder="Nur bei Rolle Mitarbeiter erforderlich"
            />
          </Field>
        </div>

        {message && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Sendet Einladung..." : "Benutzer einladen"}
          </button>

          <button
            type="button"
            onClick={() =>
              router.push(`/dashboard/admin/companies/${companyId}`)
            }
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