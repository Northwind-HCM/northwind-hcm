"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type CompanySettings = {
  companyName?: string;
  status?: "setup" | "active" | "inactive";
  isDemo?: boolean;
  payrollEnabled?: boolean;
  employeeSelfServiceEnabled?: boolean;
  documentUploadEnabled?: boolean;
  absenceWorkflowEnabled?: boolean;
  defaultPayrollCutoffDay?: number;
};

export default function CompanySettingsPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const [settings, setSettings] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, "companies", companyId));

        if (snap.exists()) {
          setSettings(snap.data() as CompanySettings);
        }
      } catch (error: any) {
        setMessage(error.message || "Einstellungen konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [companyId]);

  function updateField(
    key: keyof CompanySettings,
    value: string | boolean | number
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "companies", companyId), {
        status: settings.status || "setup",
        isDemo: Boolean(settings.isDemo),
        payrollEnabled: settings.payrollEnabled ?? true,
        employeeSelfServiceEnabled: settings.employeeSelfServiceEnabled ?? true,
        documentUploadEnabled: settings.documentUploadEnabled ?? true,
        absenceWorkflowEnabled: settings.absenceWorkflowEnabled ?? true,
        defaultPayrollCutoffDay: Number(settings.defaultPayrollCutoffDay || 25),
        updatedAt: new Date().toISOString(),
      });

      setMessage("Einstellungen gespeichert ✅");
    } catch (error: any) {
      setMessage(error.message || "Einstellungen konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        Lade Einstellungen...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <p className="text-gray-600">
            Portal-, Payroll- und Self-Service-Einstellungen.
          </p>
        </div>

        <Link
          href={`/dashboard/${companyId}`}
          className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
        >
          Zurück
        </Link>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow">
        <div>
          <h2 className="text-xl font-semibold">
            {settings.companyName || "Mandant"}
          </h2>
          <p className="text-sm text-gray-500">Mandanten-ID: {companyId}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <select
              className="w-full rounded-xl border p-3"
              value={settings.status || "setup"}
              onChange={(e) =>
                <select
  className="w-full rounded-xl border p-3"
  value={settings.status || "setup"}
  onChange={(e) => updateField("status", e.target.value)}
>
  <option value="setup">Setup</option>
  <option value="active">Aktiv</option>
  <option value="inactive">Inaktiv</option>
</select>
              }
            >
              <option value="setup">Setup</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">
              Payroll Cutoff Tag
            </span>
            <input
              type="number"
              min={1}
              max={31}
              className="w-full rounded-xl border p-3"
              value={settings.defaultPayrollCutoffDay || 25}
              onChange={(e) =>
                updateField("defaultPayrollCutoffDay", Number(e.target.value))
              }
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Toggle
            label="Demo-Mandant"
            checked={Boolean(settings.isDemo)}
            onChange={(value) => updateField("isDemo", value)}
          />

          <Toggle
            label="Payroll aktiviert"
            checked={settings.payrollEnabled ?? true}
            onChange={(value) => updateField("payrollEnabled", value)}
          />

          <Toggle
            label="Employee Self Service aktiviert"
            checked={settings.employeeSelfServiceEnabled ?? true}
            onChange={(value) =>
              updateField("employeeSelfServiceEnabled", value)
            }
          />

          <Toggle
            label="Dokumentenupload aktiviert"
            checked={settings.documentUploadEnabled ?? true}
            onChange={(value) => updateField("documentUploadEnabled", value)}
          />

          <Toggle
            label="Fehlzeitenworkflow aktiviert"
            checked={settings.absenceWorkflowEnabled ?? true}
            onChange={(value) => updateField("absenceWorkflowEnabled", value)}
          />
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={saveSettings}
          className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Speichert..." : "Einstellungen speichern"}
        </button>
      </section>
    </main>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-xl border p-4">
      <span className="font-medium text-gray-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5"
      />
    </label>
  );
}