"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

type PayrollMonth = {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
};

type TimeEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  comment: string;
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

function getCurrentMonthId() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthName(monthNumber: number) {
  return new Date(2026, monthNumber - 1, 1).toLocaleString("de-DE", {
    month: "long",
  });
}

export default function EmployeeTimePage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const employeeId = Array.isArray(params.employeeId)
    ? params.employeeId[0]
    : params.employeeId;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [months, setMonths] = useState<PayrollMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const employeeName = useMemo(() => {
    if (!employee) return "";
    return `${employee.firstName} ${employee.lastName}`.trim();
  }, [employee]);

  const previewHours = useMemo(
    () => calculateHours(startTime, endTime, breakMinutes),
    [startTime, endTime, breakMinutes]
  );

  const totalHours = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.totalHours, 0),
    [entries]
  );

  async function ensureCurrentMonthExists() {
    if (!companyId) return "";

    const now = new Date();
    const year = now.getFullYear();
    const monthNumber = now.getMonth() + 1;
    const monthId = getCurrentMonthId();

    const monthRef = doc(db, "companies", companyId, "payrollMonths", monthId);
    const monthSnapshot = await getDoc(monthRef);

    if (!monthSnapshot.exists()) {
      await setDoc(
        monthRef,
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
    }

    return monthId;
  }

  async function loadEntries(monthId: string) {
    if (!companyId || !employeeId || !monthId) return;

    const snapshot = await getDocs(
      collection(
        db,
        "companies",
        companyId,
        "payrollMonths",
        monthId,
        "timeEntries"
      )
    );

    const items: TimeEntry[] = snapshot.docs
      .map((entryDoc) => {
        const data = entryDoc.data();

        return {
          id: entryDoc.id,
          employeeId: data.employeeId || "",
          employeeName: data.employeeName || "",
          date: data.date || "",
          startTime: data.startTime || "",
          endTime: data.endTime || "",
          breakMinutes: Number(data.breakMinutes || 0),
          totalHours: Number(data.totalHours || 0),
          comment: data.comment || "",
        };
      })
      .filter((entry) => entry.employeeId === employeeId)
      .sort((a, b) => a.date.localeCompare(b.date));

    setEntries(items);
  }

  async function loadData() {
    if (!companyId || !employeeId) return;

    setLoading(true);
    setMessage("");

    try {
      const employeeSnapshot = await getDoc(
        doc(db, "companies", companyId, "employees", employeeId)
      );

      if (employeeSnapshot.exists()) {
        const data = employeeSnapshot.data();

        setEmployee({
          id: employeeSnapshot.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        });
      }

      const currentMonthId = await ensureCurrentMonthExists();

      const monthSnapshot = await getDocs(
        collection(db, "companies", companyId, "payrollMonths")
      );

      const monthItems: PayrollMonth[] = monthSnapshot.docs
        .map((monthDoc) => {
          const data = monthDoc.data();

          return {
            id: monthDoc.id,
            month: data.month || "",
            year: data.year || 0,
            monthNumber: data.monthNumber || 0,
          };
        })
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          return b.monthNumber - a.monthNumber;
        });

      setMonths(monthItems);

      const activeMonthId = selectedMonthId || currentMonthId || monthItems[0]?.id || "";

      setSelectedMonthId(activeMonthId);

      if (activeMonthId) {
        await loadEntries(activeMonthId);
      }
    } catch (error) {
      console.error(error);
      setMessage("Zeiterfassung konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMonthChange(monthId: string) {
    setSelectedMonthId(monthId);
    await loadEntries(monthId);
  }

  async function addTimeEntry() {
    if (!companyId || !employeeId || !selectedMonthId || !employee) return;

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
      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          selectedMonthId,
          "timeEntries"
        ),
        {
          employeeId,
          employeeName,
          date,
          startTime,
          endTime,
          breakMinutes,
          totalHours: previewHours,
          comment,
          submittedBy: "employee",
          status: "submitted",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setDate("");
      setComment("");
      setMessage("Stundeneintrag wurde eingereicht.");

      await loadEntries(selectedMonthId);
    } catch (error) {
      console.error(error);
      setMessage("Stundeneintrag konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId, employeeId]);

  if (loading) {
    return (
      <main className="space-y-6 bg-gray-50 p-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Zeiterfassung...
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-gray-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Employee Self Service
          </p>

          <h1 className="text-3xl font-bold">Meine Zeiten</h1>

          <p className="mt-1 text-gray-600">
            Arbeitszeiten und Hinweise für den Payroll-Monat erfassen.
          </p>
        </div>

        <Link
          href={`/employee/self-service/${companyId}/${employeeId}`}
          className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
        >
          Zurück zum Self Service
        </Link>
      </div>

      {message && (
        <div className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-900">
          {message}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Mitarbeiter</p>
          <p className="mt-2 text-xl font-bold">{employeeName || "-"}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Payroll-Monat</p>

          <select
            value={selectedMonthId}
            onChange={(event) => handleMonthChange(event.target.value)}
            className="mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
          >
            {months.map((month) => (
              <option key={month.id} value={month.id}>
                {month.month} {month.year}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Gesamtstunden</p>
          <p className="mt-2 text-3xl font-bold">
            {Math.round(totalHours * 100) / 100}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Zeit erfassen</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Stunden
            </label>

            <div className="rounded-xl border bg-gray-50 px-4 py-3 font-semibold">
              {previewHours}
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-5">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kommentar
            </label>

            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="z. B. Projekt, Überstunden, Dienstreise, Besonderheit"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addTimeEntry}
          disabled={saving}
          className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Speichert..." : "Zeit einreichen"}
        </button>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Meine eingereichten Zeiten</h2>

        {entries.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Zeiten erfasst.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Datum</th>
                  <th className="p-3 font-semibold">Beginn</th>
                  <th className="p-3 font-semibold">Ende</th>
                  <th className="p-3 font-semibold">Pause</th>
                  <th className="p-3 font-semibold">Stunden</th>
                  <th className="p-3 font-semibold">Kommentar</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t align-top">
                    <td className="p-3 font-medium">{entry.date}</td>
                    <td className="p-3">{entry.startTime}</td>
                    <td className="p-3">{entry.endTime}</td>
                    <td className="p-3">{entry.breakMinutes} Min.</td>
                    <td className="p-3 font-semibold">{entry.totalHours}</td>
                    <td className="p-3">{entry.comment || "-"}</td>
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