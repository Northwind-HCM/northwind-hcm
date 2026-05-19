"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type PayrollMonthStatus =
  | "open"
  | "in_progress"
  | "waiting_for_client"
  | "ready_for_approval"
  | "approved"
  | "closed";

type PayrollMonth = {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
  status: PayrollMonthStatus;
  missingItems: string[];
  notes: string;
};

const statusLabels: Record<PayrollMonthStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  waiting_for_client: "Warten auf Kunde",
  ready_for_approval: "Bereit zur Freigabe",
  approved: "Freigegeben",
  closed: "Abgeschlossen",
};

const statusStyles: Record<PayrollMonthStatus, string> = {
  open: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_for_client: "bg-yellow-100 text-yellow-800",
  ready_for_approval: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-800",
};

function getMonthName(monthNumber: number) {
  return new Date(2026, monthNumber - 1, 1).toLocaleString("de-DE", {
    month: "long",
  });
}

function createMonthId(year: number, monthNumber: number) {
  return `${year}-${String(monthNumber).padStart(2, "0")}`;
}

export default function MonthlyPayrollPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const [months, setMonths] = useState<PayrollMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newMissingItem, setNewMissingItem] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const selectedMonth = useMemo(
    () => months.find((month) => month.id === selectedMonthId),
    [months, selectedMonthId]
  );

  async function loadMonths() {
    if (!companyId) return;

    setLoading(true);
    setMessage("");

    try {
      const snapshot = await getDocs(
        collection(db, "companies", companyId, "payrollMonths")
      );

      const items: PayrollMonth[] = snapshot.docs.map((monthDoc) => {
        const data = monthDoc.data();

        return {
          id: monthDoc.id,
          month: data.month || "",
          year: data.year || 0,
          monthNumber: data.monthNumber || 0,
          status: data.status || "open",
          missingItems: data.missingItems || [],
          notes: data.notes || "",
        };
      });

      const sortedItems = items.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.monthNumber - a.monthNumber;
      });

      setMonths(sortedItems);

      if (sortedItems.length > 0 && !selectedMonthId) {
        setSelectedMonthId(sortedItems[0].id);
        setNotes(sortedItems[0].notes || "");
      }
    } catch (error) {
      console.error(error);
      setMessage("Fehler beim Laden der Payroll-Monate.");
    } finally {
      setLoading(false);
    }
  }

  async function createCurrentMonth() {
    if (!companyId) {
      setMessage("Keine companyId gefunden.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const now = new Date();
      const year = now.getFullYear();
      const monthNumber = now.getMonth() + 1;
      const monthId = createMonthId(year, monthNumber);

      await setDoc(
        doc(db, "companies", companyId, "payrollMonths", monthId),
        {
          year,
          monthNumber,
          month: getMonthName(monthNumber),
          status: "open",
          missingItems: [],
          notes: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Payroll-Monat wurde angelegt.");
      setSelectedMonthId(monthId);
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Monat konnte nicht angelegt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function createNextMonth() {
    if (!companyId) return;

    setSaving(true);
    setMessage("");

    try {
      const baseDate = selectedMonth
        ? new Date(selectedMonth.year, selectedMonth.monthNumber - 1, 1)
        : new Date();

      const nextDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + 1,
        1
      );

      const year = nextDate.getFullYear();
      const monthNumber = nextDate.getMonth() + 1;
      const monthId = createMonthId(year, monthNumber);

      await setDoc(
        doc(db, "companies", companyId, "payrollMonths", monthId),
        {
          year,
          monthNumber,
          month: getMonthName(monthNumber),
          status: "open",
          missingItems: [],
          notes: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMessage("Folgemonat wurde angelegt.");
      setSelectedMonthId(monthId);
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Folgemonat konnte nicht angelegt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: PayrollMonthStatus) {
    if (!companyId || !selectedMonth) return;

    setSaving(true);
    setMessage("");

    try {
      const payload: Record<string, unknown> = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === "approved") {
        payload.approvedAt = serverTimestamp();
      }

      if (status === "closed") {
        payload.closedAt = serverTimestamp();
      }

      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", selectedMonth.id),
        payload
      );

      setMessage("Status wurde aktualisiert.");
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Status konnte nicht aktualisiert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function addMissingItem() {
    if (!companyId || !selectedMonth || !newMissingItem.trim()) return;

    setSaving(true);
    setMessage("");

    try {
      const updatedItems = [
        ...(selectedMonth.missingItems || []),
        newMissingItem.trim(),
      ];

      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", selectedMonth.id),
        {
          missingItems: updatedItems,
          updatedAt: serverTimestamp(),
        }
      );

      setNewMissingItem("");
      setMessage("Offener Punkt wurde hinzugefügt.");
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Offener Punkt konnte nicht hinzugefügt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function removeMissingItem(itemToRemove: string) {
    if (!companyId || !selectedMonth) return;

    setSaving(true);
    setMessage("");

    try {
      const updatedItems = selectedMonth.missingItems.filter(
        (item) => item !== itemToRemove
      );

      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", selectedMonth.id),
        {
          missingItems: updatedItems,
          updatedAt: serverTimestamp(),
        }
      );

      setMessage("Offener Punkt wurde erledigt.");
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Offener Punkt konnte nicht entfernt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    if (!companyId || !selectedMonth) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", selectedMonth.id),
        {
          notes,
          updatedAt: serverTimestamp(),
        }
      );

      setMessage("Notizen wurden gespeichert.");
      await loadMonths();
    } catch (error) {
      console.error(error);
      setMessage("Notizen konnten nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMonths();
  }, [companyId]);

  useEffect(() => {
    setNotes(selectedMonth?.notes || "");
  }, [selectedMonth?.id]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Monatsmodul...
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Payroll Workspace
          </p>
          <h1 className="text-3xl font-bold">Monatsabrechnung</h1>
          <p className="mt-1 text-gray-600">
            Monatsstatus, offene Punkte, Payroll Input und Kundenfreigabe zentral verwalten.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/${companyId}/payroll`}
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
          >
            Payroll Übersicht
          </Link>

          <button
            type="button"
            onClick={createCurrentMonth}
            disabled={saving}
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Aktuellen Monat anlegen"}
          </button>

          <button
            type="button"
            onClick={createNextMonth}
            disabled={saving}
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Folgemonat anlegen
          </button>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
          {message}
        </div>
      )}

      {months.length === 0 ? (
        <section className="rounded-2xl border border-dashed bg-white p-10 text-center shadow">
          <h2 className="text-xl font-semibold">
            Noch kein Payroll-Monat vorhanden
          </h2>
          <p className="mt-2 text-gray-600">
            Lege den aktuellen Monat an, um den Payroll Workspace zu starten.
          </p>

          <button
            type="button"
            onClick={createCurrentMonth}
            disabled={saving}
            className="mt-6 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Aktuellen Monat anlegen"}
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Payroll-Monate</p>
              <p className="mt-2 text-3xl font-bold">{months.length}</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Ausgewählter Monat</p>
              <p className="mt-2 text-xl font-bold">
                {selectedMonth?.month} {selectedMonth?.year}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Status</p>
              {selectedMonth && (
                <span
                  className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                    statusStyles[selectedMonth.status]
                  }`}
                >
                  {statusLabels[selectedMonth.status]}
                </span>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-gray-500">Offene Punkte</p>
              <p className="mt-2 text-3xl font-bold">
                {selectedMonth?.missingItems.length || 0}
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-2xl bg-white p-4 shadow">
              <h2 className="mb-4 text-lg font-semibold">Monate</h2>

              <div className="space-y-2">
                {months.map((month) => (
                  <button
                    key={month.id}
                    type="button"
                    onClick={() => setSelectedMonthId(month.id)}
                    className={`w-full rounded-xl border p-4 text-left hover:bg-gray-50 ${
                      selectedMonthId === month.id
                        ? "border-blue-900 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {month.month} {month.year}
                        </p>
                        <p className="text-xs text-gray-500">
                          {month.missingItems.length} offene Punkte
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          statusStyles[month.status]
                        }`}
                      >
                        {statusLabels[month.status]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            {selectedMonth && (
              <section className="space-y-6">
                <section className="rounded-2xl bg-white p-6 shadow">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {selectedMonth.month} {selectedMonth.year}
                      </h2>
                      <p className="mt-1 text-gray-600">
                        Steuerung des monatlichen Payroll-Prozesses.
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        statusStyles[selectedMonth.status]
                      }`}
                    >
                      {statusLabels[selectedMonth.status]}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateStatus("in_progress")}
                      disabled={saving}
                      className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                    >
                      In Bearbeitung
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("waiting_for_client")}
                      disabled={saving}
                      className="rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-900 hover:bg-yellow-100 disabled:opacity-50"
                    >
                      Warten auf Kunde
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("ready_for_approval")}
                      disabled={saving}
                      className="rounded-xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-900 hover:bg-purple-100 disabled:opacity-50"
                    >
                      Zur Freigabe
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("approved")}
                      disabled={saving}
                      className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
                    >
                      Freigegeben
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("closed")}
                      disabled={saving}
                      className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Abschließen
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("open")}
                      disabled={saving}
                      className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
                    >
                      Wieder öffnen
                    </button>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-2xl bg-white p-6 shadow">
                    <h3 className="text-xl font-semibold">Offene Punkte</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Fehlende Unterlagen, Rückfragen oder Payroll-Themen für diesen Monat.
                    </p>

                    <div className="mt-5 flex gap-2">
                      <input
                        value={newMissingItem}
                        onChange={(event) =>
                          setNewMissingItem(event.target.value)
                        }
                        placeholder="z. B. Steuer-ID fehlt"
                        className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
                      />

                      <button
                        type="button"
                        onClick={addMissingItem}
                        disabled={saving}
                        className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        Hinzufügen
                      </button>
                    </div>

                    <div className="mt-5 space-y-2">
                      {selectedMonth.missingItems.length === 0 ? (
                        <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800">
                          Keine offenen Punkte vorhanden.
                        </p>
                      ) : (
                        selectedMonth.missingItems.map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between gap-3 rounded-xl border p-4"
                          >
                            <p className="text-sm">{item}</p>

                            <button
                              type="button"
                              onClick={() => removeMissingItem(item)}
                              disabled={saving}
                              className="rounded-lg bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200 disabled:opacity-50"
                            >
                              Erledigt
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow">
                    <h3 className="text-xl font-semibold">Interne Notizen</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Hinweise für Payroll-Team, Kundenstatus oder Monatsbesonderheiten.
                    </p>

                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={9}
                      placeholder="z. B. Bonuszahlungen, Krankmeldungen, neue Mitarbeiter, Austritte..."
                      className="mt-5 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
                    />

                    <button
                      type="button"
                      onClick={saveNotes}
                      disabled={saving}
                      className="mt-3 rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      Notizen speichern
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-6 shadow">
                  <h3 className="text-xl font-semibold">Payroll Input</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Zentrale Eingaben für die monatliche Lohnabrechnung.
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Link
                      href={`/dashboard/${companyId}/monthly/${selectedMonth.id}/time`}
                      className="rounded-xl border p-4 hover:bg-gray-50"
                    >
                      <p className="font-semibold">Stunden</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Arbeitszeiten, Überstunden und Abwesenheiten.
                      </p>
                    </Link>

                    <Link
                      href={`/dashboard/${companyId}/monthly/${selectedMonth.id}/variable-pay`}
                      className="rounded-xl border p-4 hover:bg-gray-50"
                    >
                      <p className="font-semibold">Variable Zahlungen</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Boni, Provisionen, Zuschläge und Einmalzahlungen.
                      </p>
                    </Link>

                    <Link
                      href={`/dashboard/${companyId}/monthly/${selectedMonth.id}/documents`}
                      className="rounded-xl border p-4 hover:bg-gray-50"
                    >
                      <p className="font-semibold">Dokumente</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Uploads, Reports, Lohnunterlagen und Ausgaben.
                      </p>
                    </Link>

                    <Link
                      href={`/dashboard/${companyId}/monthly/${selectedMonth.id}/approval`}
                      className="rounded-xl border p-4 hover:bg-gray-50"
                    >
                      <p className="font-semibold">Freigabe</p>
                      <p className="mt-1 text-sm text-gray-600">
                        Monatliche Kundenfreigabe für die Abrechnung.
                      </p>
                    </Link>
                  </div>
                </section>
              </section>
            )}
          </section>
        </>
      )}
    </main>
  );
}