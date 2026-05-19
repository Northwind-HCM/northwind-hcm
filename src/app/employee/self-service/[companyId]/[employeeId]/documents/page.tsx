"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

type PayrollMonth = {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
};

type DocumentCategory =
  | "payroll_input"
  | "sick_leave"
  | "child_sick"
  | "contract"
  | "variable_pay"
  | "time_tracking"
  | "payroll_output"
  | "datev_export"
  | "other";

type PayrollDocument = {
  id: string;
  name: string;
  category: DocumentCategory;
  description: string;
  employeeId: string;
  employeeName: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
};

const categoryLabels: Record<DocumentCategory, string> = {
  payroll_input: "Payroll Input",
  sick_leave: "Krankmeldung / eAU",
  child_sick: "Kind krank",
  contract: "Vertrag / Personalakte",
  variable_pay: "Variable Zahlungen",
  time_tracking: "Stunden / Zeiten",
  payroll_output: "Abrechnungsausgabe",
  datev_export: "DATEV / Export",
  other: "Sonstiges",
};

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
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

export default function EmployeeDocumentsPage() {
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
  const [documents, setDocuments] = useState<PayrollDocument[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("sick_leave");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const employeeName = useMemo(() => {
    if (!employee) return "";
    return `${employee.firstName} ${employee.lastName}`.trim();
  }, [employee]);

  async function ensureCurrentMonthExists() {
    if (!companyId) return "";

    const now = new Date();
    const year = now.getFullYear();
    const monthNumber = now.getMonth() + 1;
    const monthId = getCurrentMonthId();

    const monthRef = doc(db, "companies", companyId, "payrollMonths", monthId);
    const monthSnapshot = await getDoc(monthRef);

    if (!monthSnapshot.exists()) {
      await import("firebase/firestore").then(async ({ setDoc }) => {
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
      });
    }

    return monthId;
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

      const activeMonthId =
        selectedMonthId || currentMonthId || monthItems[0]?.id || "";

      setSelectedMonthId(activeMonthId);

      if (activeMonthId) {
        await loadDocuments(activeMonthId);
      }
    } catch (error) {
      console.error(error);
      setMessage("Dokumente konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments(monthId: string) {
    if (!companyId || !employeeId || !monthId) return;

    try {
      const snapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "documents"
        )
      );

      const items: PayrollDocument[] = snapshot.docs
        .map((documentDoc) => {
          const data = documentDoc.data();

          return {
            id: documentDoc.id,
            name: data.name || "",
            category: data.category || "other",
            description: data.description || "",
            employeeId: data.employeeId || "",
            employeeName: data.employeeName || "",
            fileUrl: data.fileUrl || "",
            fileName: data.fileName || "",
            fileSize: Number(data.fileSize || 0),
          };
        })
        .filter((document) => document.employeeId === employeeId)
        .sort((a, b) => a.name.localeCompare(b.name));

      setDocuments(items);
    } catch (error) {
      console.error(error);
      setMessage("Dokumente konnten nicht geladen werden.");
    }
  }

  async function handleMonthChange(monthId: string) {
    setSelectedMonthId(monthId);
    await loadDocuments(monthId);
  }

  async function uploadDocument() {
    if (!companyId || !employeeId || !selectedMonthId || !employee) return;

    if (!name.trim()) {
      setMessage("Bitte Dokumentname eintragen.");
      return;
    }

    if (!file) {
      setMessage("Bitte Datei auswählen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const timestamp = Date.now();
      const cleanedFileName = safeFileName(file.name);

      const storagePath = `companies/${companyId}/payrollMonths/${selectedMonthId}/documents/${timestamp}-${cleanedFileName}`;

      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);

      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          selectedMonthId,
          "documents"
        ),
        {
          name: name.trim(),
          category,
          description: description.trim(),
          employeeId,
          employeeName,
          fileUrl,
          storagePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedBy: "employee",
          uploadedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setName("");
      setDescription("");
      setFile(null);

      const fileInput = document.getElementById(
        "employeeDocumentFile"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      setMessage("Dokument wurde hochgeladen.");

      await loadDocuments(selectedMonthId);
    } catch (error) {
      console.error(error);
      setMessage("Dokument konnte nicht hochgeladen werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId, employeeId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Dokumente...
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Employee Self Service
          </p>

          <h1 className="text-3xl font-bold">Meine Dokumente</h1>

          <p className="mt-1 text-gray-600">
            Dokumente, Krankmeldungen, Kind-krank-Nachweise und Payroll-Unterlagen
            hochladen oder abrufen.
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
          <p className="text-sm text-gray-500">Meine Dokumente</p>
          <p className="mt-2 text-3xl font-bold">{documents.length}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Dokument hochladen</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Dokumentname
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Krankmeldung"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kategorie
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as DocumentCategory)
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            >
              <option value="sick_leave">Krankmeldung / eAU</option>
              <option value="child_sick">Kind krank</option>
              <option value="payroll_input">Payroll Input</option>
              <option value="time_tracking">Stunden / Zeiten</option>
              <option value="variable_pay">Variable Zahlungen</option>
              <option value="contract">Vertrag / Personalakte</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Datei
            </label>

            <input
              id="employeeDocumentFile"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Beschreibung
            </label>

            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="z. B. Zeitraum, Hinweis, Rückfrage"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={uploadDocument}
          disabled={saving}
          className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Lädt hoch..." : "Dokument hochladen"}
        </button>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Meine vorhandenen Dokumente</h2>

        {documents.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Dokumente vorhanden.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Dokument</th>
                  <th className="p-3 font-semibold">Kategorie</th>
                  <th className="p-3 font-semibold">Datei</th>
                  <th className="p-3 font-semibold">Größe</th>
                  <th className="p-3 font-semibold">Beschreibung</th>
                </tr>
              </thead>

              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-t align-top">
                    <td className="p-3 font-medium">{document.name}</td>

                    <td className="p-3">
                      {categoryLabels[document.category] || document.category}
                    </td>

                    <td className="p-3">
                      {document.fileUrl ? (
                        <a
                          href={document.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-900 underline"
                        >
                          {document.fileName || "Datei öffnen"}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-3">
                      {formatFileSize(document.fileSize)}
                    </td>

                    <td className="p-3">
                      {document.description || "-"}
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