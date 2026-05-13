"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    uid: "",
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

    if (!formData.uid || !formData.email || !formData.role) {
      setMessage("UID, E-Mail und Rolle sind erforderlich.");
      setSaving(false);
      return;
    }

    try {
      const now = new Date().toISOString();

      await setDoc(
        doc(db, "users", formData.uid),
        {
          uid: formData.uid,
          email: formData.email.trim().toLowerCase(),
          displayName: formData.displayName,
          role: formData.role,
          companyId,
          employeeId: formData.employeeId,
          accessScope: formData.role === "employee" ? "self" : "company",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      router.push(`/dashboard/admin/companies/${companyId}`);
    } catch (error: any) {
      console.error(error);
      setMessage(`Benutzer konnte nicht zugeordnet werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Benutzer zuordnen</h1>
        <p className="text-gray-600">
          Bestehenden Firebase-Auth-Benutzer einem Mandanten und einer Rolle
          zuordnen.
        </p>
        <p className="mt-1 text-xs text-gray-500">Mandanten-ID: {companyId}</p>
      </div>

      <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-900">
        <p className="font-semibold">Wichtig</p>
        <p className="mt-1">
          Der Benutzer muss vorher in Firebase Authentication angelegt werden.
          Danach die UID aus Firebase Authentication hier eintragen.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl bg-white p-6 shadow"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Firebase UID" required>
            <input
              className={inputClass}
              value={formData.uid}
              onChange={(e) => updateField("uid", e.target.value)}
              placeholder="UID aus Firebase Authentication"
              required
            />
          </Field>

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
            {saving ? "Speichert..." : "Benutzer zuordnen"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/dashboard/admin/companies/${companyId}`)}
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