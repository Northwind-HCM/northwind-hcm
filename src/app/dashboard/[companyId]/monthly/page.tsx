"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  getDefaultPayrollCycle,
  getPayrollCycleId,
  type PayrollCycle,
  type PayrollCycleStep,
  type PayrollCycleStatus,
  type PayrollCycleStepStatus,
} from "@/lib/payroll/payrollCycle";

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
  entryDate?: string;
  exitDate?: string;
  status?: string;
  missingFields?: string[];
};

type Absence = {
  id: string;
  employeeId?: string;
  employeeName?: string;
  absenceType?: string;
  absenceLabel?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  requiresEAU?: boolean;
  bgRelevant?: boolean;
};

type Task = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  employeeName?: string;
};

const months = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const cycleStatuses: { value: PayrollCycleStatus; label: string }[] = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "ready_for_review", label: "Bereit zur Prüfung" },
  { value: "approved", label: "Freigegeben" },
  { value: "closed", label: "Abgeschlossen" },
];

const stepStatuses: { value: PayrollCycleStepStatus; label: string }[] = [
  { value: "open", label: "Offen" },
  { value: "in_progress", label: "In Bearbeitung" },
  { value: "completed", label: "Erledigt" },
  { value: "blocked", label: "Blockiert" },
];

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const startIso = start.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);

  return { start, end, startIso, endIso };
}

function isEmployeeActiveInMonth(
  employee: Employee,
  startIso: string,
  endIso: string
) {
  const entryDate = employee.entryDate || "";
  const exitDate = employee.exitDate || "";

  if (employee.status === "archived") return false;
  if (entryDate && entryDate > endIso) return false;
  if (exitDate && exitDate < startIso) return false;

  return true;
}

function isDateRangeOverlapping(
  itemStart?: string,
  itemEnd?: string,
  monthStart?: string,
  monthEnd?: string
) {
  if (!itemStart || !itemEnd || !monthStart || !monthEnd) return false;

  return itemStart <= monthEnd && itemEnd >= monthStart;
}

function getAbsenceTypeLabel(value?: string) {
  if (value === "vacation") return "Urlaub";
  if (value === "sickness_without_certificate") return "Krankheit ohne Attest";
  if (value === "sickness_with_certificate") return "Krankheit mit Attest / eAU";
  if (value === "child_sickness") return "Kind krank";
  if (value === "work_accident") return "Arbeitsunfall";
  if (value === "maternity_protection") return "Mutterschutz";
  if (value === "parental_leave") return "Elternzeit";
  if (value === "unpaid_leave") return "Unbezahlte Freistellung";
  if (value === "special_leave") return "Sonderurlaub";
  if (value === "care_leave") return "Pflegezeit";
  if (value === "time_off_in_lieu") return "Freizeitausgleich";

  return "Sonstige Abwesenheit";
}

function getStatusLabel(status?: string) {
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  if (status === "done") return "Erledigt";
  if (status === "completed") return "Erledigt";
  if (status === "in_progress") return "In Bearbeitung";
  if (status === "ready_for_review") return "Bereit zur Prüfung";
  if (status === "closed") return "Abgeschlossen";
  if (status === "blocked") return "Blockiert";
  return "Offen";
}

function getStatusClass(status?: string) {
  if (
    status === "approved" ||
    status === "done" ||
    status === "completed" ||
    status === "closed"
  ) {
    return "bg-green-100 text-green-800";
  }

  if (status === "rejected" || status === "blocked") {
    return "bg-red-100 text-red-800";
  }

  if (status === "in_progress" || status === "ready_for_review") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-yellow-100 text-yellow-800";
}

function fullName(employee: Employee) {
  return (
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Unbenannter Mitarbeiter"
  );
}

export default function MonthlyPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const now = useMemo(() => new Date(), []);

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cycle, setCycle] = useState<PayrollCycle | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingCycle, setSavingCycle] = useState(false);
  const [message, setMessage] = useState("");

  const { startIso, endIso } = useMemo(
    () => getMonthRange(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const cycleId = useMemo(
    () => getPayrollCycleId(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  async function loadPayrollCycle() {
    const cycleRef = doc(db, "companies", companyId, "payrollCycles", cycleId);
    const cycleSnap = await getDoc(cycleRef);

    if (cycleSnap.exists()) {
      setCycle({
        id: cycleSnap.id,
        ...cycleSnap.data(),
      } as PayrollCycle);

      return;
    }

    const defaultCycle = getDefaultPayrollCycle({
      year: selectedYear,
      month: selectedMonth,
    });

    const nowIso = new Date().toISOString();

    await setDoc(cycleRef, {
      ...defaultCycle,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    setCycle({
      ...defaultCycle,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  async function loadMonthData() {
    setLoading(true);
    setMessage("");

    try {
      await loadPayrollCycle();

      const employeesSnap = await getDocs(
        collection(db, "companies", companyId, "employees")
      );

      const employeeData = employeesSnap.docs.map((employeeDoc) => ({
        id: employeeDoc.id,
        ...employeeDoc.data(),
      })) as Employee[];

      const absencesSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "absences"),
          orderBy("startDate", "asc")
        )
      );

      const absenceData = absencesSnap.docs.map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      })) as Absence[];

      let taskData: Task[] = [];

      try {
        const tasksSnap = await getDocs(
          query(
            collection(db, "companies", companyId, "tasks"),
            where("status", "!=", "done")
          )
        );

        taskData = tasksSnap.docs.map((taskDoc) => ({
          id: taskDoc.id,
          ...taskDoc.data(),
        })) as Task[];
      } catch {
        taskData = [];
      }

      setEmployees(employeeData);
      setAbsences(absenceData);
      setTasks(taskData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Monatsdaten konnten nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveCycle(update: Partial<PayrollCycle>) {
    if (!cycle) return;

    setSavingCycle(true);
    setMessage("");

    try {
      const updatedCycle = {
        ...cycle,
        ...update,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "companies", companyId, "payrollCycles", cycle.id), {
        ...update,
        updatedAt: updatedCycle.updatedAt,
      });

      setCycle(updatedCycle);
      setMessage("Payroll Cycle gespeichert ✅");
    } catch (error: any) {
      console.error(error);
      setMessage(`Payroll Cycle konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSavingCycle(false);
    }
  }

  async function updateCycleStatus(status: PayrollCycleStatus) {
    const update: Partial<PayrollCycle> = {
      status,
    };

    if (status === "approved") {
      update.approvedAt = new Date().toISOString();
    }

    if (status === "closed") {
      update.closedAt = new Date().toISOString();
    }

    await saveCycle(update);
  }

  async function updateStepStatus(
    stepKey: string,
    status: PayrollCycleStepStatus
  ) {
    if (!cycle) return;

    const updatedSteps = cycle.steps.map((step) =>
      step.key === stepKey
        ? {
            ...step,
            status,
          }
        : step
    );

    await saveCycle({ steps: updatedSteps });
  }

  useEffect(() => {
    loadMonthData();
  }, [companyId, selectedMonth, selectedYear]);

  const activeEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        isEmployeeActiveInMonth(employee, startIso, endIso)
      ),
    [employees, startIso, endIso]
  );

  const entries = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.entryDate &&
          employee.entryDate >= startIso &&
          employee.entryDate <= endIso
      ),
    [employees, startIso, endIso]
  );

  const exits = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.exitDate &&
          employee.exitDate >= startIso &&
          employee.exitDate <= endIso
      ),
    [employees, startIso, endIso]
  );

  const monthAbsences = useMemo(
    () =>
      absences.filter((absence) =>
        isDateRangeOverlapping(
          absence.startDate,
          absence.endDate,
          startIso,
          endIso
        )
      ),
    [absences, startIso, endIso]
  );

  const openAbsences = monthAbsences.filter(
    (absence) => absence.status !== "approved" && absence.status !== "rejected"
  );

  const eAUAbsences = monthAbsences.filter((absence) => absence.requiresEAU);

  const bgRelevantAbsences = monthAbsences.filter((absence) => absence.bgRelevant);

  const employeesWithMissingData = activeEmployees.filter(
    (employee) => employee.missingFields && employee.missingFields.length > 0
  );

  const openTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "completed"
  );

  const payrollReady =
    activeEmployees.length > 0 &&
    employeesWithMissingData.length === 0 &&
    openAbsences.length === 0 &&
    openTasks.length === 0;

  useEffect(() => {
    if (!cycle || loading) return;

    if (cycle.payrollReady !== payrollReady) {
      saveCycle({ payrollReady });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrollReady, loading]);

  const cards = [
    {
      title: "Aktive Mitarbeiter",
      value: String(activeEmployees.length),
      subline: `${entries.length} Eintritt(e), ${exits.length} Austritt(e)`,
      color: "bg-blue-50 text-blue-900",
    },
    {
      title: "Offene Aufgaben",
      value: String(openTasks.length),
      subline: "Nicht erledigte Aufgaben",
      color: "bg-yellow-50 text-yellow-900",
    },
    {
      title: "Fehlzeiten",
      value: String(monthAbsences.length),
      subline: `${openAbsences.length} offen · ${eAUAbsences.length} eAU`,
      color: "bg-red-50 text-red-900",
    },
    {
      title: "Payroll Ready",
      value: payrollReady ? "Ja" : "Nein",
      subline: payrollReady ? "Bereit zur Freigabe" : "Offene Punkte vorhanden",
      color: payrollReady
        ? "bg-green-50 text-green-900"
        : "bg-gray-100 text-gray-900",
    },
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Monatsübersicht</h1>

          <p className="text-gray-600">
            Payroll-, HR- und Monatsaktivitäten zentral verwalten.
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
        <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Monat
            </label>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-xl border p-3"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Jahr
            </label>

            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border p-3"
            />
          </div>

          <button
            type="button"
            onClick={loadMonthData}
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Aktualisieren
          </button>

          <p className="text-sm text-gray-500">
            Zeitraum: {startIso} bis {endIso} · Cycle: {cycleId}
          </p>
        </div>
      </section>

      {cycle && (
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Payroll Cycle</p>

              <h2 className="mt-1 text-2xl font-bold">
                {months[selectedMonth]} {selectedYear}
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Persistenter Monatslauf mit Historie, Status und Freigabe.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${getStatusClass(
                cycle.status
              )}`}
            >
              {getStatusLabel(cycle.status)}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cycle Status
              </label>

              <select
                value={cycle.status}
                onChange={(e) =>
                  updateCycleStatus(e.target.value as PayrollCycleStatus)
                }
                className="w-full rounded-xl border p-3"
              >
                {cycleStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cutoff Date
              </label>

              <input
                type="date"
                value={cycle.cutoffDate || ""}
                onChange={(e) => saveCycle({ cutoffDate: e.target.value })}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Payroll Ready
              </label>

              <div
                className={`rounded-xl p-3 font-medium ${
                  payrollReady
                    ? "bg-green-50 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {payrollReady ? "Ja" : "Nein"}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notizen
            </label>

            <textarea
              value={cycle.notes || ""}
              onChange={(e) => setCycle({ ...cycle, notes: e.target.value })}
              onBlur={() => saveCycle({ notes: cycle.notes || "" })}
              className="min-h-24 w-full rounded-xl border p-3"
              placeholder="Interne Notizen zum Monatslauf"
            />
          </div>

          {savingCycle && (
            <p className="mt-3 text-sm text-gray-500">Speichert...</p>
          )}
        </section>
      )}

      {loading ? (
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Monatsdaten...
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.title}
                className={`rounded-2xl p-6 shadow ${card.color}`}
              >
                <p className="text-sm opacity-70">{card.title}</p>

                <h2 className="mt-2 text-3xl font-bold">{card.value}</h2>

                <p className="mt-2 text-xs opacity-75">{card.subline}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold">Eintritte</h2>

              <p className="text-sm text-gray-600">
                Neue Mitarbeiter im Monat.
              </p>

              <ListBlock
                emptyText="Keine Eintritte in diesem Monat."
                items={entries.map((employee) => ({
                  id: employee.id,
                  title: fullName(employee),
                  text: employee.entryDate || "-",
                }))}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold">Austritte</h2>

              <p className="text-sm text-gray-600">
                Austritte im ausgewählten Monat.
              </p>

              <ListBlock
                emptyText="Keine Austritte in diesem Monat."
                items={exits.map((employee) => ({
                  id: employee.id,
                  title: fullName(employee),
                  text: employee.exitDate || "-",
                }))}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold">Offene Stammdaten</h2>

              <p className="text-sm text-gray-600">
                Pflichtangaben aktiver Mitarbeiter.
              </p>

              <ListBlock
                emptyText="Keine offenen Stammdaten."
                items={employeesWithMissingData.map((employee) => ({
                  id: employee.id,
                  title: fullName(employee),
                  text: (employee.missingFields || []).join(", "),
                  href: `/dashboard/${companyId}/employees/${employee.id}`,
                }))}
              />
            </div>
          </section>

          {cycle && (
            <section className="rounded-2xl bg-white p-6 shadow">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Payroll Workflow</h2>

                  <p className="text-sm text-gray-600">
                    Status der monatlichen Lohnabrechnung.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateCycleStatus("in_progress")}
                  className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  Payroll starten
                </button>
              </div>

              <div className="space-y-4">
                {(cycle.steps || []).map((step, index) => (
                  <div
                    key={step.key}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Schritt {index + 1}
                        </p>

                        <h3 className="mt-1 text-lg font-semibold">
                          {step.title}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          {step.description}
                        </p>
                      </div>

                      <select
                        value={step.status}
                        onChange={(e) =>
                          updateStepStatus(
                            step.key,
                            e.target.value as PayrollCycleStepStatus
                          )
                        }
                        className={`rounded-full px-3 py-2 text-xs font-medium ${getStatusClass(
                          step.status
                        )}`}
                      >
                        {stepStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Fehlzeiten</h2>

                  <p className="text-sm text-gray-600">
                    Urlaub, Krankheit, eAU und BG-relevante Fälle.
                  </p>
                </div>

                <Link
                  href={`/dashboard/${companyId}/absences`}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                >
                  Anzeigen
                </Link>
              </div>

              <div className="mb-4 flex flex-wrap gap-2 text-xs">
                <Badge label={`${openAbsences.length} offen`} />
                <Badge label={`${eAUAbsences.length} eAU`} />
                <Badge label={`${bgRelevantAbsences.length} BG-relevant`} />
              </div>

              <ListBlock
                emptyText="Keine Fehlzeiten im ausgewählten Monat."
                items={monthAbsences.slice(0, 8).map((absence) => ({
                  id: absence.id,
                  title:
                    absence.employeeName ||
                    absence.employeeId ||
                    "Unbekannter Mitarbeiter",
                  text: `${
                    absence.absenceLabel ||
                    getAbsenceTypeLabel(absence.absenceType)
                  } · ${absence.startDate || "-"} bis ${
                    absence.endDate || "-"
                  } · ${getStatusLabel(absence.status)}`,
                }))}
              />
            </div>

            <div className="rounded-2xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Offene Aufgaben</h2>

                  <p className="text-sm text-gray-600">
                    Payroll- und HR-Aufgaben dieses Monats.
                  </p>
                </div>

                <Link
                  href={`/dashboard/${companyId}/tasks`}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                >
                  Aufgaben öffnen
                </Link>
              </div>

              <ListBlock
                emptyText="Keine offenen Aufgaben vorhanden."
                items={openTasks.slice(0, 8).map((task) => ({
                  id: task.id,
                  title: task.title || "Offene Aufgabe",
                  text: task.description || task.dueDate || "-",
                }))}
              />
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
      {label}
    </span>
  );
}

function ListBlock({
  items,
  emptyText,
}: {
  items: {
    id: string;
    title: string;
    text: string;
    href?: string;
  }[];
  emptyText: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => {
        const content = (
          <div className="rounded-xl border p-4">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-gray-600">{item.text}</p>
          </div>
        );

        if (item.href) {
          return (
            <Link key={item.id} href={item.href} className="block hover:opacity-80">
              {content}
            </Link>
          );
        }

        return <div key={item.id}>{content}</div>;
      })}
    </div>
  );
}