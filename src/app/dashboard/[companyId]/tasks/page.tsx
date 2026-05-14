"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type TaskStatus = "open" | "in_progress" | "done";

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type Task = {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
  employeeId?: string;
  employeeName?: string;
  category?: string;
  payrollRelevant?: boolean;
};

const inputClass = "w-full rounded-xl border p-3";

function getStatusLabel(status?: string) {
  if (status === "done") return "Erledigt";
  if (status === "in_progress") return "In Bearbeitung";
  return "Offen";
}

function getStatusClass(status?: string) {
  if (status === "done") return "bg-green-100 text-green-800";
  if (status === "in_progress") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-800";
}

function employeeName(employee?: Employee) {
  if (!employee) return "";
  return `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
}

export default function TasksPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<"open" | "all" | "done">("open");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    employeeId: "",
    category: "Payroll",
    payrollRelevant: true,
  });

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const employeesSnap = await getDocs(
        query(collection(db, "companies", companyId, "employees"))
      );

      const employeeData = employeesSnap.docs.map((employeeDoc) => ({
        id: employeeDoc.id,
        ...employeeDoc.data(),
      })) as Employee[];

      const tasksSnap = await getDocs(
        query(
          collection(db, "companies", companyId, "tasks"),
          orderBy("dueDate", "asc")
        )
      );

      const taskData = tasksSnap.docs.map((taskDoc) => ({
        id: taskDoc.id,
        ...taskDoc.data(),
      })) as Task[];

      setEmployees(employeeData);
      setTasks(taskData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Aufgaben konnten nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId]);

  function updateField(
    key: keyof typeof formData,
    value: string | boolean
  ) {
    setFormData((prev) => ({
      ...prev,
      [key]: value as never,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.title) {
      setMessage("Bitte einen Aufgabentitel erfassen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const selectedEmployee = employees.find(
        (employee) => employee.id === formData.employeeId
      );

      await addDoc(collection(db, "companies", companyId, "tasks"), {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        category: formData.category,
        payrollRelevant: formData.payrollRelevant,
        employeeId: formData.employeeId,
        employeeName: employeeName(selectedEmployee),
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      setFormData({
        title: "",
        description: "",
        dueDate: "",
        employeeId: "",
        category: "Payroll",
        payrollRelevant: true,
      });

      setMessage("Aufgabe wurde angelegt ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Aufgabe konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(task: Task, status: TaskStatus) {
    try {
      await updateDoc(doc(db, "companies", companyId, "tasks", task.id), {
        status,
        updatedAt: new Date().toISOString(),
      });

      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Status konnte nicht geändert werden: ${error.message}`);
    }
  }

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks;

    if (filter === "done") {
      return tasks.filter((task) => task.status === "done");
    }

    return tasks.filter((task) => task.status !== "done");
  }, [tasks, filter]);

  const openCount = tasks.filter((task) => task.status !== "done").length;
  const doneCount = tasks.filter((task) => task.status === "done").length;
  const payrollRelevantCount = tasks.filter(
    (task) => task.status !== "done" && task.payrollRelevant
  ).length;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <h1 className="text-3xl font-bold">Aufgaben</h1>
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Aufgaben...
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold">Aufgaben</h1>
        <p className="text-gray-600">
          Payroll- und HR-Aufgaben erfassen, nachverfolgen und abschließen.
        </p>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-yellow-50 p-5 text-yellow-900 shadow">
          <p className="text-sm opacity-75">Offene Aufgaben</p>
          <p className="mt-2 text-3xl font-bold">{openCount}</p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-5 text-blue-900 shadow">
          <p className="text-sm opacity-75">Payroll-relevant</p>
          <p className="mt-2 text-3xl font-bold">{payrollRelevantCount}</p>
        </div>

        <div className="rounded-2xl bg-green-50 p-5 text-green-900 shadow">
          <p className="text-sm opacity-75">Erledigt</p>
          <p className="mt-2 text-3xl font-bold">{doneCount}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Neue Aufgabe</h2>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Titel" required>
              <input
                className={inputClass}
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="z. B. Eintritt prüfen"
                required
              />
            </Field>

            <Field label="Fällig am">
              <input
                type="date"
                className={inputClass}
                value={formData.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
              />
            </Field>

            <Field label="Kategorie">
              <select
                className={inputClass}
                value={formData.category}
                onChange={(e) => updateField("category", e.target.value)}
              >
                <option>Payroll</option>
                <option>HR</option>
                <option>Onboarding</option>
                <option>Dokumente</option>
                <option>Fehlzeiten</option>
                <option>Sonstiges</option>
              </select>
            </Field>

            <Field label="Mitarbeiterbezug">
              <select
                className={inputClass}
                value={formData.employeeId}
                onChange={(e) => updateField("employeeId", e.target.value)}
              >
                <option value="">Ohne Mitarbeiterbezug</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeName(employee)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Beschreibung">
            <textarea
              className="min-h-24 w-full rounded-xl border p-3"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Optional: Details zur Aufgabe"
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.payrollRelevant}
              onChange={(e) =>
                updateField("payrollRelevant", e.target.checked)
              }
            />
            Payroll-relevant
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Speichert..." : "Aufgabe anlegen"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Aufgabenübersicht</h2>
            <p className="text-sm text-gray-600">
              Offene und erledigte Aufgaben dieses Mandanten.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`rounded-xl px-4 py-2 text-sm ${
                filter === "open"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Offen
            </button>

            <button
              type="button"
              onClick={() => setFilter("done")}
              className={`rounded-xl px-4 py-2 text-sm ${
                filter === "done"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Erledigt
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-xl px-4 py-2 text-sm ${
                filter === "all"
                  ? "bg-blue-900 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Alle
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Keine Aufgaben vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {task.title || "Ohne Titel"}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          task.status
                        )}`}
                      >
                        {getStatusLabel(task.status)}
                      </span>

                      {task.payrollRelevant && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                          Payroll
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {task.category || "Sonstiges"}
                      {task.dueDate ? ` · fällig am ${task.dueDate}` : ""}
                      {task.employeeName ? ` · ${task.employeeName}` : ""}
                    </p>

                    {task.description && (
                      <p className="mt-2 text-sm text-gray-700">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {task.status !== "done" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            updateTaskStatus(task, "in_progress")
                          }
                          className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-800 hover:bg-blue-100"
                        >
                          In Bearbeitung
                        </button>

                        <button
                          type="button"
                          onClick={() => updateTaskStatus(task, "done")}
                          className="rounded bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700"
                        >
                          Erledigt
                        </button>
                      </>
                    )}

                    {task.status === "done" && (
                      <button
                        type="button"
                        onClick={() => updateTaskStatus(task, "open")}
                        className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200"
                      >
                        Wieder öffnen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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