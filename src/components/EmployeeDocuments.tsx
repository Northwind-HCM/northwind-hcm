"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

type Props = {
  companyId: string;
  employeeId: string;
};

type EmployeeDocument = {
  id: string;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
};

const documentTypes = [
  { value: "employment_contract", label: "Arbeitsvertrag" },
  {
    value: "private_health_insurance_certificate",
    label: "PKV-Bescheinigung mit Basisbeiträgen",
  },
  { value: "student_certificate", label: "Immatrikulationsbescheinigung" },
  { value: "disability_certificate", label: "Schwerbehindertennachweis" },
  { value: "work_permit", label: "Aufenthaltstitel / Arbeitserlaubnis" },
  { value: "vwl_documents", label: "VWL-Unterlagen" },
  { value: "pension_documents", label: "Direktversicherung / bAV-Unterlagen" },
  { value: "health_insurance", label: "Krankenkassenunterlage" },
  { value: "tax_id_optional", label: "Steuer-ID Nachweis optional" },
  { value: "social_security_optional", label: "SV-Nachweis optional" },
  { value: "other", label: "Sonstiges Dokument" },
];

export default function EmployeeDocuments({ companyId, employeeId }: Props) {
  const [documentType, setDocumentType] = useState("employment_contract");
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    const q = query(
      collection(
        db,
        "companies",
        companyId,
        "employees",
        employeeId,
        "documents"
      ),
      orderBy("uploadedAt", "desc")
    );

    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((documentDoc) => ({
      id: documentDoc.id,
      ...documentDoc.data(),
    })) as EmployeeDocument[];

    setDocuments(data);
  }

  useEffect(() => {
    loadDocuments();
  }, [companyId, employeeId]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setMessage("Bitte Datei auswählen.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const safeFileName = file.name.replaceAll(" ", "_");

      const storagePath = `companies/${companyId}/employees/${employeeId}/documents/${Date.now()}_${safeFileName}`;

      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file);

      const fileUrl = await getDownloadURL(fileRef);

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "employees",
          employeeId,
          "documents"
        ),
        {
          documentType,
          fileName: file.name,
          fileUrl,
          storagePath,
          uploadedAt: serverTimestamp(),
        }
      );

      setMessage("Dokument hochgeladen ✅");
      setFile(null);
      await loadDocuments();
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Upload ❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function getDocumentLabel(value?: string) {
    return documentTypes.find((item) => item.value === value)?.label || value;
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-6 shadow">
      <div>
        <h2 className="text-xl font-semibold">Dokumente</h2>
        <p className="text-sm text-gray-600">
          Laden Sie relevante Payroll-Unterlagen hoch. Steuer-ID- und
          SV-Nachweise sind optional und nur bei Bedarf erforderlich.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-semibold">Dokumentart</label>
            <select
              className="w-full rounded border p-3"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {documentTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-semibold">Datei</label>
            <input
              type="file"
              className="w-full rounded border p-3"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-900 px-5 py-3 text-white disabled:opacity-50"
        >
          {loading ? "Lädt hoch..." : "Dokument hochladen"}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>

      <div className="border-t pt-4">
        <h3 className="mb-3 font-semibold">Hochgeladene Dokumente</h3>

        {documents.length === 0 ? (
          <p className="text-sm text-gray-600">
            Noch keine Dokumente vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between rounded-xl border p-3"
              >
                <div>
                  <p className="font-medium">
                    {getDocumentLabel(document.documentType)}
                  </p>
                  <p className="text-sm text-gray-600">{document.fileName}</p>
                </div>

                {document.fileUrl && (
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
                  >
                    Öffnen
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}