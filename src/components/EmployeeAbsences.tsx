"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import FormField from "./FormField";

const inputClass = "w-full rounded border p-3";

const absenceTypes = [
  { value: "vacation", label: "Urlaub" },
  { value: "sickness", label: "Krankheit" },
  { value: "other", label: "Sonstige" },
];

function getAbsenceLabel(value?: string) {
  return absenceTypes.find((item) => item.value === value)?.label || value;
}

export default function EmployeeAbsences() {
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    absenceType: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  async function loadAbsences(companyId: string, employeeId: string) {
    const absencesSnap = await getDocs(
      query(
        collection(db, "companies", companyId, "absences"),
        where("employeeId", "==", employeeId)
      )
    );

    setAbsences(
      absencesSnap.docs.map((absenceDoc) => ({
        id: absenceDoc.id,
        ...absenceDoc.data(),
      }))
    );
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/employee/login";
        return;
      }

      const companiesSnap = await getDocs(collection(db, "companies"));

      for (const companyDoc of companiesSnap.docs) {
        const employeesSnap = await getDocs(
          query(
            collection(db, "companies", companyDoc.id, "employees"),
            where("userId", "==", user.uid)
          )
        );

        if (!employeesSnap.empty) {
          const employeeDoc = employeesSnap.docs[0];

          const employeeData = {
            id: employeeDoc.id,
            companyId: companyDoc.id,
            ...employeeDoc.data(),
          };

          const companySnap = await getDoc(
            doc(db, "companies", companyDoc.id)
          );

          const companyData = companySnap.exists() ? companySnap.data() : {};

          setEmployee(employeeData);
          setCompany(companyData);

          await loadAbsences(companyDoc.id, employeeDoc.id);

          setLoading(false);
          return;
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function updateField(key: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!employee) return;

    await addDoc(collection(db, "companies", employee.companyId, "absences"), {
      ...formData,
      employeeId: employee.id,
      employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
      employeeEmail: employee.email || "",
      status: "requested",
      createdBy: "employee",
      createdAt: serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    const adminEmail = company?.hrAdminEmail || company?.email;

    if (adminEmail) {
      await fetch("/api/absence-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: adminEmail,
          subject: "Neuer Fehlzeitenantrag im Northwind Payroll Portal",
          message: `${employee.firstName || ""} ${employee.lastName || ""} hat eine Fehlzeit beantragt: ${getAbsenceLabel(
            formData.absenceType
          )} vom ${formData.startDate} bis ${formData.endDate}.`,
        }),
      });
    }

    setMessage("Fehlzeit beantragt ✅");

    setFormData({
      absenceType: "",
      startDate: "",
      endDate: "",
      notes: "",
    });

    await loadAbsences(employee.companyId, employee.id);
  }

  if (loading) return <p className="p-6">Lade...</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Meine Fehlzeiten</h1>
        <p className="text-gray-600">
          Hier können Sie Urlaub oder andere Abwesenheiten beantragen.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h2 className="text-xl font-semibold">Neue Fehlzeit</h2>

        <FormField label="Art">
          <select
            className={inputClass}
            value={formData.absenceType}
            onChange={(e) => updateField("absenceType", e.target.value)}
            required
          >
            <option value="">Bitte auswählen</option>
            {absenceTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className={inputClass}
            value={formData.startDate}
            onChange={(e) => updateField("startDate", e.target.value)}
            required
          />

          <input
            type="date"
            className={inputClass}
            value={formData.endDate}
            onChange={(e) => updateField("endDate", e.target.value)}
            required
          />
        </div>

        <textarea
          placeholder="Hinweis (optional)"
          className="w-full rounded border p-3"
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />

        <button className="rounded-xl bg-blue-900 px-5 py-3 text-white">
          Beantragen
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </form>

      <div className="space-y-3 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Meine Anträge</h2>

        {absences.length === 0 ? (
          <p className="text-gray-600">Noch keine Einträge</p>
        ) : (
          absences.map((absence) => (
            <div key={absence.id} className="rounded border p-3">
              <p className="font-medium">
                {getAbsenceLabel(absence.absenceType)}
              </p>
              <p className="text-sm text-gray-600">
                {absence.startDate} - {absence.endDate}
              </p>
              <p className="text-xs text-gray-500">{absence.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}