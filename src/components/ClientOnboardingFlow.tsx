"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Props = {
  companyId: string;
};

type StepStatus = "complete" | "incomplete";

type Step = {
  title: string;
  description: string;
  href: string;
  status: StepStatus;
  missing: string[];
};

function getCompanyMissingFields(company: Record<string, any>) {
  const missing: string[] = [];

  if (!company.companyName) missing.push("Firmenname");
  if (!company.email) missing.push("E-Mail");
  if (!company.taxNumber) missing.push("Steuernummer");
  if (!company.companyNumber) missing.push("Betriebsnummer");
  if (!company.bgCompanyNumber) missing.push("BG-Unternehmensnummer");
  if (!company.bgPin) missing.push("BG PIN");
  if (!company.payrollStartMonth) missing.push("Payroll-Startmonat");

  return missing;
}

export default function ClientOnboardingFlow({ companyId }: Props) {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    async function loadOnboardingStatus() {
      try {
        const companyRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyRef);
        const company = companySnap.exists() ? companySnap.data() : {};

        const employeesSnap = await getDocs(
          collection(db, "companies", companyId, "employees")
        );

        const employees = employeesSnap.docs.map((employeeDoc) => ({
          id: employeeDoc.id,
          ...employeeDoc.data(),
        })) as Array<{
          id: string;
          status?: string;
          missingFields?: string[];
        }>;

        const companyMissing = getCompanyMissingFields(company);

        const incompleteEmployees = employees.filter(
          (employee) =>
            employee.status !== "complete" ||
            (employee.missingFields && employee.missingFields.length > 0)
        );

        const allMissingEmployeeFields = Array.from(
          new Set(
            incompleteEmployees.flatMap(
              (employee) => employee.missingFields || []
            )
          )
        );

        const employeeMissing =
          employees.length === 0
            ? ["Noch keine Mitarbeiter angelegt"]
            : allMissingEmployeeFields;

        const nextSteps: Step[] = [
          {
            title: "Firmenstammdaten",
            description:
              "Erfassen Sie Unternehmens-, Steuer-, Berufsgenossenschafts- und Zahlungsdaten.",
            href: `/dashboard/${companyId}/company-data`,
            status: companyMissing.length === 0 ? "complete" : "incomplete",
            missing: companyMissing,
          },
          {
            title: "Mitarbeiterdaten",
            description:
              "Legen Sie alle abzurechnenden Mitarbeiter an und ergänzen Sie fehlende Payroll-Daten.",
            href: `/dashboard/${companyId}/employees`,
            status:
              employees.length > 0 && incompleteEmployees.length === 0
                ? "complete"
                : "incomplete",
            missing: employeeMissing,
          },
          {
            title: "Dokumente",
            description:
              "Laden Sie Arbeitsverträge, Steuer-ID-Nachweise, SV-Nachweise, Krankenkassenunterlagen und weitere Dokumente hoch.",
            href: `/dashboard/${companyId}/employees`,
            status: "incomplete",
            missing: ["Dokumentenprüfung erfolgt pro Mitarbeiter"],
          },
          {
            title: "Payroll Start",
            description:
              "Finale Prüfung, ob der Mandant für die erste Abrechnung bereit ist.",
            href: `/dashboard/${companyId}`,
            status:
              companyMissing.length === 0 &&
              employees.length > 0 &&
              incompleteEmployees.length === 0
                ? "complete"
                : "incomplete",
            missing:
              companyMissing.length === 0 &&
              employees.length > 0 &&
              incompleteEmployees.length === 0
                ? []
                : ["Noch nicht bereit für Payroll Start"],
          },
        ];

        const completed = nextSteps.filter(
          (step) => step.status === "complete"
        ).length;

        setSteps(nextSteps);
        setProgress(Math.round((completed / nextSteps.length) * 100));
      } catch (error) {
        console.error("Fehler beim Laden des Onboarding-Status:", error);
      } finally {
        setLoading(false);
      }
    }

    loadOnboardingStatus();
  }, [companyId]);

  if (loading) {
    return <p>Lade Onboarding-Status...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mandanten-Onboarding</h1>
        <p className="text-gray-600">
          Übersicht der offenen Schritte bis zur abrechnungsbereiten Einrichtung.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Fortschritt</h2>
          <span className="text-sm font-medium">
            {progress}% abgeschlossen
          </span>
        </div>

        <div className="h-4 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-900"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {step.description}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  step.status === "complete"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {step.status === "complete" ? "Erledigt" : "Offen"}
              </span>
            </div>

            {step.missing.length > 0 && (
              <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
                <p className="mb-1 font-medium">Offene Punkte:</p>
                <ul className="list-disc space-y-1 pl-5">
                  {step.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href={step.href}
              className="inline-block rounded-xl bg-blue-900 px-4 py-2 text-sm text-white hover:bg-blue-800"
            >
              Öffnen
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}