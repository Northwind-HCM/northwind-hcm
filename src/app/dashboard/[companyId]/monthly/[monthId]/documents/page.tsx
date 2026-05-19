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
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

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
  employeeId?: string;
  employeeName?: string;
  fileUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
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

function formatFileSize(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function MonthlyDocumentsPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const monthId = Array.isArray(params.monthId)
    ? params.monthId[0]
    : params.monthId;

  const [documents, setDocuments] = useState<PayrollDocument[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("payroll_input");
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [message, setMessage] = useState("");

  const groupedDocuments = useMemo(() => {
    return documents.reduce((groups, document) => {
      const key = document.category;

      if (!groups[key]) groups[key] = [];
      groups[key].push(document);

      return groups;
    }, {} as Record<string, PayrollDocument[]>);
  }, [documents]);

  async function loadDocuments() {
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
          };
        })
        .sort((a, b) =>
          `${a.lastName} ${a.firstName}`.localeCompare(
            `${b.lastName} ${b.firstName}`
          )
        );

      setEmployees(employeeItems);

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
            storagePath: data.storagePath || "",
            fileName: data.fileName || "",
            fileType: data.fileType || "",
            fileSize: data.fileSize || 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setDocuments(items);
    } catch (error) {
      console.error(error);
      setMessage("Dokumente konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function addDocument() {
    if (!companyId || !monthId) return;

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
      const selectedEmployee = employees.find(
        (employee) => employee.id === employeeId
      );

      const employeeName = selectedEmployee
        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
        : "";

      const timestamp = Date.now();
      const cleanedFileName = safeFileName(file.name);

      const storagePath = `companies/${companyId}/payrollMonths/${monthId}/documents/${timestamp}-${cleanedFileName}`;

      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);

      const fileUrl = await getDownloadURL(storageRef);

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "documents"
        ),
        {
          name: name.trim(),
          category,
          description: description.trim(),
          employeeId: employeeId || "",
          employeeName,
          fileUrl,
          storagePath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      setName("");
      setDescription("");
      setEmployeeId("");
      setFile(null);

      const fileInput = document.getElementById(
        "documentFile"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      setMessage("Dokument wurde hochgeladen und gespeichert.");

      await loadDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Dokument konnte nicht hochgeladen werden.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(document: PayrollDocument) {
    if (!companyId || !monthId) return;

    setSaving(true);
    setMessage("");

    try {
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath);
        await deleteObject(storageRef);
      }

      await deleteDoc(
        doc(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "documents",
          document.id
        )
      );

      setMessage("Dokument wurde gelöscht.");

      await loadDocuments();
    } catch (error) {
      console.error(error);
      setMessage("Dokument konnte nicht gelöscht werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [companyId, monthId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Dokumentencenter...
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

          <h1 className="text-3xl font-bold">Dokumentencenter</h1>

          <p className="mt-1 text-gray-600">
            Monatsbezogene Payroll-Dokumente, Krankmeldungen, Reports und
            Input-Dateien mit echtem Datei-Upload verwalten.
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
          <p className="text-sm text-gray-500">Dokumente</p>
          <p className="mt-2 text-3xl font-bold">{documents.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Kategorien</p>
          <p className="mt-2 text-3xl font-bold">
            {Object.keys(groupedDocuments).length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Payroll-Monat</p>
          <p className="mt-2 text-2xl font-bold">{monthId}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Neues Dokument hochladen</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Dokumentname
            </label>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Krankmeldung Max Mustermann"
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
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Mitarbeiter
            </label>

            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            >
              <option value="">Kein Mitarbeiter / Firmenbezogen</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Optional – für firmenbezogene Dokumente leer lassen
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Datei
            </label>

            <input
              id="documentFile"
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />

            <p className="mt-1 text-xs text-gray-500">
              PDF, Excel, Bild oder sonstige Payroll-Datei
            </p>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Beschreibung
            </label>

            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="z. B. Eingereicht durch Mitarbeiterportal"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addDocument}
          disabled={saving}
          className="mt-5 rounded-xl bg-blue-900 px-6 py-3 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Lädt hoch..." : "Dokument hochladen"}
        </button>
      </section>

      <section className="space-y-6">
        {documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow">
            <p className="text-gray-500">Noch keine Dokumente vorhanden.</p>
          </div>
        ) : (
          Object.entries(groupedDocuments).map(([categoryKey, items]) => (
            <section
              key={categoryKey}
              className="rounded-2xl bg-white p-6 shadow"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {categoryLabels[categoryKey as DocumentCategory]}
                  </h2>

                  <p className="text-sm text-gray-600">
                    {items.length} Dokument(e)
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 font-semibold">Dokument</th>
                      <th className="p-3 font-semibold">Mitarbeiter</th>
                      <th className="p-3 font-semibold">Datei</th>
                      <th className="p-3 font-semibold">Größe</th>
                      <th className="p-3 font-semibold">Beschreibung</th>
                      <th className="p-3 font-semibold">Kategorie</th>
                      <th className="p-3 font-semibold text-right">Aktion</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((document) => (
                      <tr key={document.id} className="border-t align-top">
                        <td className="p-3 font-medium">{document.name}</td>

                        <td className="p-3">{document.employeeName || "-"}</td>

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

                        <td className="p-3">
                          {categoryLabels[document.category]}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteDocument(document)}
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
            </section>
          ))
        )}
      </section>
    </main>
  );
}