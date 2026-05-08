"use client";

import { use, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, db } from "../../../../../lib/firebase";

import EmployeeSelfServiceForm from "../../../../../components/EmployeeSelfServiceForm";
import EmployeeDocuments from "../../../../../components/EmployeeDocuments";
import {
  checkEmployeeReadiness,
  checkDocuments,
  getRequiredDocumentTypes,
} from "../../../../../lib/payrollReadiness";

type EmployeeData = {
  firstName?: string;
  lastName?: string;
  authUid?: string;
  userId?: string;
  [key: string]: any;
};

type DocumentData = {
  documentType?: string;
};

export default function EmployeeSelfServicePage({
  params,
}: {
  params: Promise<{ companyId: string; employeeId: string }>;
}) {
  const { companyId, employeeId } = use(params);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/employee/login";
        return;
      }

      const employeeRef = doc(
        db,
        "companies",
        companyId,
        "employees",
        employeeId
      );

      const employeeSnap = await getDoc(employeeRef);

      if (!employeeSnap.exists()) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const employeeData = employeeSnap.data() as EmployeeData;

      if (employeeData.authUid !== user.uid && employeeData.userId !== user.uid) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const documentsSnap = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "employees",
          employeeId,
          "documents"
        )
      );

      const documentData = documentsSnap.docs.map((documentDoc) =>
        documentDoc.data()
      ) as DocumentData[];

      setEmployee(employeeData);
      setDocuments(documentData);
      setAllowed(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, employeeId]);

  if (loading) {
    return <p className="p-6">Prüfe Zugriff...</p>;
  }

  if (!allowed || !employee) {
    return (
      <p className="p-6 text-red-700">
        Zugriff verweigert. Sie dürfen diese Daten nicht einsehen.
      </p>
    );
  }

  const employeeCheck = checkEmployeeReadiness(employee);
  const documentCheck = checkDocuments(employee, documents);
  const requiredDocuments = getRequiredDocumentTypes(employee);

  const uploadedDocumentTypes = documents.map((document) => document.documentType);

  const completedItems = [
    employee.firstName && employee.lastName ? "Persönliche Daten" : null,
    employee.taxId ? "Steuer-ID" : null,
    employee.socialSecurityNumber ? "Sozialversicherungsnummer" : null,
    employee.healthInsurance ? "Krankenkasse" : null,
    employee.iban ? "Bankverbindung" : null,
  ].filter(Boolean);

  const totalRequired =
    employeeCheck.missing.length +
    documentCheck.missing.length +
    completedItems.length;

  const completedCount = completedItems.length;

  const progress =
    totalRequired === 0 ? 100 : Math.round((completedCount / totalRequired) * 100);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Meine Mitarbeiterdaten</h1>
          <p className="text-gray-600">
            Bitte prüfen und ergänzen Sie Ihre Daten für die Lohnabrechnung.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Ihr Onboarding-Status</h2>
              <p className="text-sm text-gray-600">
                Hier sehen Sie, welche Angaben oder Dokumente noch fehlen.
              </p>
            </div>

            <span
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                employeeCheck.ready && documentCheck.ready
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {employeeCheck.ready && documentCheck.ready
                ? "Vollständig"
                : "Unvollständig"}
            </span>
          </div>

          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span>Fortschritt</span>
              <span>{progress}%</span>
            </div>

            <div className="h-3 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-900"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 font-semibold">Fehlende Angaben</h3>

              {employeeCheck.missing.length === 0 ? (
                <p className="text-sm text-green-700">
                  Alle erforderlichen Angaben sind vorhanden ✅
                </p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-yellow-800">
                  {employeeCheck.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

<div className="rounded-xl border p-4">
  <h3 className="mb-2 font-semibold">Dokumente</h3>

  <div className="space-y-2 text-sm text-gray-700">
    <p>📁 Elektronische Personalakte</p>
    <p>💶 Gehaltsdokumente</p>
    <p>⬆️ Uploads für HR / Payroll</p>
  </div>
</div>
          </div>
        </section>

        <EmployeeSelfServiceForm companyId={companyId} employeeId={employeeId} />

        <EmployeeDocuments companyId={companyId} employeeId={employeeId} />
      </div>
    </main>
  );
}