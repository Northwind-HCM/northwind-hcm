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

type TimeEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  comment: string;
  totalHours: number;
};

function calculateHours(startTime: string, endTime: string, breakMinutes: number) {
  if (!startTime || !endTime) return 0;

  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  const diff = end - start - breakMinutes;

  if (diff <= 0) return 0;

  return Math.round((diff / 60) * 100) / 100;
}

export default function MonthlyTimePage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const monthId = Array.isArray(params.monthId)
    ? params.monthId[0]
    : params.monthId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  const selectedEmployee = employees.find((employee) => employee.id === employeeId);

  const previewHours = useMemo(
    () => calculateHours(startTime, endTime, breakMinutes),
    [startTime, endTime, breakMinutes]
  );

  const totalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.totalHours, 0),
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

      const timeSnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "timeEntries"
        )
      );

      const timeItems: TimeEntry[] = timeSnapshot.docs
        .map((entryDoc) => {
          const data = entryDoc.data();

          return {
            id: entryDoc.id,
            employeeId: data.employeeId || "",
            employeeName: data.employeeName || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            breakMinutes: data.breakMinutes || 0,
            comment: data.comment || "",
            totalHours: data.totalHours || 0,
          };
        })
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.employeeName.localeCompare(b.employeeName);
        });

      setEmployees(employeeItems);
      setEntries(timeItems);

      if (employeeItems.length > 0 && !employeeId) {
        setEmployeeId(employeeItems[0].id);
      }
    } catch (error) {
      console.error(error);
      setMessage("Stundenerfassung konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function addTimeEntry() {
    if (!companyId || !monthId || !selectedEmployee) {
      setMessage("Bitte Mitarbeiter auswählen.");
      return;
    }

    if (!date) {
      setMessage("Bitte Datum eintragen.");
      return;
    }

    if (previewHours <= 0) {
      setMessage("Bitte gültige Arbeitszeit eintragen.");
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
          "timeEntries"
        ),
        {
          employeeId: selectedEmployee.id,
          employeeName,
          date,
          startTime,
          endTime,
          breakMinutes,
          comment,
          totalHours: previewHours,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setComment("");
      setMessage("Stundeneintrag wurde gespeichert.");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Stundeneintrag konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTimeEntry(entryId: string) {
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
          "timeEntries",
          entryId
        )
      );

      setMessage("Stundeneintrag wurde gelöscht.");

      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Stundeneintrag konnte nicht gelöscht werden.");
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
          Lade Stundenerfassung...
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">Payroll Input</p>
          <h1 className="text-3xl font-bold">Stundenerfassung</h1>
          <p className="mt-1 text-gray-600">
            Arbeitszeiten, Pausen, Überstunden und Hinweise für den Payroll-Monat {monthId}.
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Einträge</p>
          <p className="mt-2 text-3xl font-bold">{entries.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Gesamtstunden</p>
          <p className="mt-2 text-3xl font-bold">
            {Math.round(totalHours * 100) / 100}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Vorschau aktueller Eintrag</p>
          <p className="mt-2 text-3xl font-bold">{previewHours}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Neuen Stundeneintrag erfassen</h2>

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
              Datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Beginn
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Ende
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Pause in Minuten
            </label>
            <input
              type="number"
              min={0}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kommentar
            </label>
            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="z. B. Überstunden, Projekt, Dienstreise, Nachtarbeit..."
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addTimeEntry}
          disabled={saving || employees.length === 0}
          className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Speichert..." : "Stundeneintrag speichern"}
        </button>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Erfasste Stunden</h2>
            <p className="text-sm text-gray-600">
              Übersicht der gespeicherten Arbeitszeiten für diesen Payroll-Monat.
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Stunden erfasst.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Datum</th>
                  <th className="p-3 font-semibold">Mitarbeiter</th>
                  <th className="p-3 font-semibold">Beginn</th>
                  <th className="p-3 font-semibold">Ende</th>
                  <th className="p-3 font-semibold">Pause</th>
                  <th className="p-3 font-semibold">Stunden</th>
                  <th className="p-3 font-semibold">Kommentar</th>
                  <th className="p-3 font-semibold text-right">Aktion</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t align-top">
                    <td className="p-3">{entry.date}</td>
                    <td className="p-3 font-medium">{entry.employeeName}</td>
                    <td className="p-3">{entry.startTime}</td>
                    <td className="p-3">{entry.endTime}</td>
                    <td className="p-3">{entry.breakMinutes} Min.</td>
                    <td className="p-3 font-semibold">{entry.totalHours}</td>
                    <td className="p-3">{entry.comment || "-"}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteTimeEntry(entry.id)}
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