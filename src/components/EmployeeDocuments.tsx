"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";

type Props = {
  companyId: string;
  employeeId: string;
};

type EmployeeDocument = {
  id: string;
  documentType?: string;
  documentLabel?: string;
  fileName?: string;
  fileUrl?: string;
  storagePath?: string;
  uploadedBy?: string;
  payrollRelevant?: boolean;
  visibleForEmployee?: boolean;
  status?: "uploaded" | "checked" | "rejected";
};

const documentTypes = [
  { value: "employment_contract", label: "Arbeitsvertrag", payrollRelevant: false },
  { value: "payslip", label: "Gehaltsabrechnung", payrollRelevant: true },
  { value: "private_health_insurance_certificate", label: "PKV-Bescheinigung", payrollRelevant: true },
  { value: "student_certificate", label: "Immatrikulationsbescheinigung", payrollRelevant: true },
  { value: "disability_certificate", label: "Schwerbehindertennachweis", payrollRelevant: true },
  { value: "work_permit", label: "Aufenthaltstitel / Arbeitserlaubnis", payrollRelevant: true },
  { value: "vwl_documents", label: "VWL-Unterlagen", payrollRelevant: true },
  { value: "pension_documents", label: "Direktversicherung / bAV", payrollRelevant: true },
  { value: "health_insurance", label: "Krankenkassenunterlage", payrollRelevant: true },
  { value: "sickness_certificate", label: "Krankmeldung / Nachweis", payrollRelevant: true },
  { value: "tax_id_optional", label: "Steuer-ID Nachweis optional", payrollRelevant: true },
  { value: "social_security_optional", label: "SV-Nachweis optional", payrollRelevant: true },
  { value: "other", label: "Sonstiges Dokument", payrollRelevant: false },
];

function getDocumentType(value?: string) {
  return documentTypes.find((item) => item.value === value);
}

export default function EmployeeDocuments({ companyId, employeeId }: Props) {
  const [documentType, setDocumentType] = useState("employment_contract");
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    try {
      const documentsQuery = query(
        collection(db, "companies", companyId, "employees", employeeId, "documents"),
        orderBy("uploadedAt", "desc")
      );

      const snapshot = await getDocs(documentsQuery);

      const data = snapshot.docs.map((documentDoc) => ({
        id: documentDoc.id,
        ...documentDoc.data(),
      })) as EmployeeDocument[];

      setDocuments(data);
    } catch (error: any) {
      console.error(error);
      setMessage(`Dokumente konnten nicht geladen werden: ${error.message}`);
    }
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

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Die Datei darf maximal 10 MB groß sein.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const selectedType = getDocumentType(documentType);
      const safeFileName = file.name.replaceAll(" ", "_");

      const storagePath = `employee-documents/${companyId}/${employeeId}/${Date.now()}_${safeFileName}`;
      const fileRef = ref(storage, storagePath);

      await uploadBytes(fileRef, file, {
        contentType: file.type,
      });

      const fileUrl = await getDownloadURL(fileRef);

      await addDoc(
        collection(db, "companies", companyId, "employees", employeeId, "documents"),
        {
          documentType,
          documentLabel: selectedType?.label || "",
          fileName: file.name,
          fileUrl,
          storagePath,
          fileSize: file.size,
          contentType: file.type,
          payrollRelevant: selectedType?.payrollRelevant ?? false,
          visibleForEmployee: true,
          status: "uploaded",
          uploadedBy: auth.currentUser?.uid || "",
          uploadedAt: serverTimestamp(),
          updatedAt: new Date().toISOString(),
        }
      );

      setMessage("Dokument hochgeladen ✅");
      setFile(null);

      const input = document.getElementById("employee-document-file") as HTMLInputElement | null;
      if (input) input.value = "";

      await loadDocuments();
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Upload ❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white p-6 shadow">
      <div>
        <h2 className="text-xl font-semibold">Dokumente</h2>
        <p className="text-sm text-gray-600">
          Payroll-, HR- und Mitarbeiterdokumente sicher hochladen und verwalten.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-semibold">Dokumentart</label>
            <select
              className="w-full rounded-xl border p-3"
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
              id="employee-document-file"
              type="file"
              className="w-full rounded-xl border p-3"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Lädt hoch..." : "Dokument hochladen"}
        </button>

        {message && (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}
      </form>

      <div className="border-t pt-5">
        <h3 className="mb-3 font-semibold">Hochgeladene Dokumente</h3>

        {documents.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
            Noch keine Dokumente vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {document.documentLabel ||
                      getDocumentType(document.documentType)?.label ||
                      document.documentType}
                  </p>

                  <p className="text-sm text-gray-600">{document.fileName}</p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {document.payrollRelevant && (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">
                        Payroll-relevant
                      </span>
                    )}

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                      {document.status || "uploaded"}
                    </span>
                  </div>
                </div>

                {document.fileUrl && (
                  <a
                    href={document.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-gray-100 px-4 py-2 text-center text-sm font-medium hover:bg-gray-200"
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