"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type VariablePayType =
  | "bonus"
  | "commission"
  | "allowance"
  | "overtime"
  | "expense"
  | "benefit"
  | "other";

type VariablePayEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: VariablePayType;
  label: string;
  amount: number;
  taxable: boolean;
  socialSecurityRelevant: boolean;
  comment: string;
};

const typeLabels: Record<VariablePayType, string> = {
  bonus: "Bonus",
  commission: "Provision",
  allowance: "Zulage/Zuschlag",
  overtime: "Überstundenvergütung",
  expense: "Reisekosten/Erstattung",
  benefit: "Geldwerter Vorteil",
  other: "Sonstiges",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function VariablePayPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const monthId = Array.isArray(params.monthId)
    ? params.monthId[0]
    : params.monthId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<VariablePayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<VariablePayType>("bonus");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [taxable, setTaxable] = useState(true);
  const [socialSecurityRelevant, setSocialSecurityRelevant] = useState(true);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  const selectedEmployee = employees.find((employee) => employee.id === employeeId);

  const totalAmount = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.amount, 0),
    [entries]
  );

  const taxableAmount = useMemo(
    () =>
      entries
        .filter((entry) => entry.taxable)
        .reduce((sum, entry) => sum + entry.amount, 0),
    [entries]
  );

  const nonTaxableAmount = useMemo(
    () =>
      entries
        .filter((entry) => !entry.taxable)
        .reduce((sum, entry) => sum + entry.amount, 0),
    [entries]
  );

  async function loadData() {
    if (!companyId || !monthId) return;

    setLoading(true);
    setMessage("");

    try {
      const employeeSnapshot = await getDocs(
        collection(db, "companies", companyId, "employees")
      );

      const employeeItems: Employee[] = employeeSnapshot.docs
        .map((employeeDoc) => {
          const data = employeeDoc.data();

          return {
            id: employeeDoc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
          };
        })
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          )
        );

      const paySnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "variablePayEntries"
        )
      );

      const payItems: VariablePayEntry[] = paySnapshot.docs
        .map((payDoc) => {
          const data = payDoc.data();

          return {
            id: payDoc.id,
            employeeId: data.employeeId || "",
            employeeName: data.employeeName || "",
            type: data.type || "other",
            label: data.label || "",
            amount: Number(data.amount || 0),
            taxable: data.taxable ?? true,
            socialSecurityRelevant: data.socialSecurityRelevant ?? true,
            comment: data.comment || "",
          };
        })
        .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

      setEmployees(employeeItems);
      setEntries(payItems);

      if (employeeItems.length > 0 && !employeeId) {
        setEmployeeId(employeeItems[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage("Variable Zahlungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function addVariablePayEntry() {
    if (!companyId || !monthId || !selectedEmployee) {
      setMessage("Bitte Mitarbeiter auswählen.");
      return;
    }

    const numericAmount = Number(amount.replace(",", "."));

    if (!numericAmount || numericAmount <= 0) {
      setMessage("Bitte einen gültigen Betrag eintragen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const employeeName = `${selectedEmployee.firstName} ${selectedEmployee.lastName}`.trim();

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "variablePayEntries"
        ),
        {
          employeeId: selectedEmployee.id,
          employeeName,
          type,
          label: label.trim() || typeLabels[type],
          amount: numericAmount,
          taxable,
          socialSecurityRelevant,
          comment,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setLabel("");
      setAmount("");
      setComment("");
      setMessage("Variable Zahlung wurde gespeichert.");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Variable Zahlung konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteVariablePayEntry(entryId: string) {
    if (!companyId || !monthId) return;

    setSaving(true);
    setMessage("");

    try {
      await deleteDoc(
        doc(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "variablePayEntries",
          entryId
        )
      );

      setMessage("Variable Zahlung wurde gelöscht.");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Variable Zahlung konnte nicht gelöscht werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId, monthId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade variable Zahlungen...
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">Payroll Input</p>
          <h1 className="text-3xl font-bold">Variable Zahlungen</h1>
          <p className="mt-1 text-gray-600">
            Boni, Provisionen, Zuschläge, Erstattungen und geldwerte Vorteile für den Payroll-Monat {monthId}.
          </p>
        </div>

        <Link
          href={`/dashboard/${companyId}/monthly`}
          className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
        >
          Zurück zum Monatsmodul
        </Link>
      </div>

      {message && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Einträge</p>
          <p className="mt-2 text-3xl font-bold">{entries.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Gesamtsumme</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Steuerpflichtig</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(taxableAmount)}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Nicht steuerpflichtig</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(nonTaxableAmount)}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Neue variable Zahlung erfassen</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mitarbeiter
            </label>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            >
              {employees.length === 0 ? (
                <option value="">Keine Mitarbeiter vorhanden</option>
              ) : (
                employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Art
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as VariablePayType)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            >
              {Object.entries(typeLabels).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bezeichnung
            </label>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="z. B. Monatsbonus, Spesen, Nachtzuschlag"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Betrag EUR
            </label>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="z. B. 250,00"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              type="checkbox"
              checked={taxable}
              onChange={(event) => setTaxable(event.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">steuerpflichtig</span>
          </label>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input
              type="checkbox"
              checked={socialSecurityRelevant}
              onChange={(event) =>
                setSocialSecurityRelevant(event.target.checked)
              }
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">SV-pflichtig</span>
          </label>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kommentar
            </label>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="z. B. laut Kundenfreigabe, Beleg liegt vor, steuerfrei prüfen..."
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addVariablePayEntry}
          disabled={saving || employees.length === 0}
          className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Speichert..." : "Variable Zahlung speichern"}
        </button>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Erfasste variable Zahlungen</h2>
          <p className="text-sm text-gray-600">
            Übersicht aller gespeicherten Zahlungen für diesen Payroll-Monat.
          </p>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine variablen Zahlungen erfasst.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Mitarbeiter</th>
                  <th className="p-3 font-semibold">Art</th>
                  <th className="p-3 font-semibold">Bezeichnung</th>
                  <th className="p-3 font-semibold">Betrag</th>
                  <th className="p-3 font-semibold">Steuer</th>
                  <th className="p-3 font-semibold">SV</th>
                  <th className="p-3 font-semibold">Kommentar</th>
                  <th className="p-3 font-semibold text-right">Aktion</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t align-top">
                    <td className="p-3 font-medium">{entry.employeeName}</td>
                    <td className="p-3">{typeLabels[entry.type]}</td>
                    <td className="p-3">{entry.label}</td>
                    <td className="p-3 font-semibold">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="p-3">
                      {entry.taxable ? "steuerpflichtig" : "steuerfrei"}
                    </td>
                    <td className="p-3">
                      {entry.socialSecurityRelevant ? "SV-pflichtig" : "SV-frei"}
                    </td>
                    <td className="p-3">{entry.comment || "-"}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteVariablePayEntry(entry.id)}
                        disabled={saving}
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}