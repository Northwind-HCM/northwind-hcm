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
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type PayrollMonth = {
  id: string;
  month: string;
  year: number;
  monthNumber: number;
  status: string;
  notes?: string;
};

type ApprovalEntry = {
  id: string;
  action: string;
  comment: string;
  approvedBy: string;
};

type TimeEntry = {
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  totalHours: number;
  comment: string;
};

type VariablePayEntry = {
  employeeName: string;
  type: string;
  label: string;
  amount: number;
  taxable: boolean;
  socialSecurityRelevant: boolean;
  comment: string;
};

type PayrollDocument = {
  name: string;
  employeeName: string;
  category: string;
  description: string;
};

type NorthwindNotification = {
  id: string;
  type: string;
  status: string;
  message: string;
  createdBy: string;
};

const statusLabels: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  waiting_for_client: "Warten auf Kunde",
  ready_for_approval: "Bereit zur Freigabe",
  approved: "Freigegeben",
  closed: "Abgeschlossen",
};

const statusStyles: Record<string, string> = {
  open: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting_for_client: "bg-yellow-100 text-yellow-800",
  ready_for_approval: "bg-purple-100 text-purple-800",
  approved: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-800",
};

const variablePayTypeLabels: Record<string, string> = {
  bonus: "Bonus",
  commission: "Provision",
  allowance: "Zulage/Zuschlag",
  overtime: "Überstundenvergütung",
  expense: "Reisekosten/Erstattung",
  benefit: "Geldwerter Vorteil",
  other: "Sonstiges",
};

const documentCategoryLabels: Record<string, string> = {
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

function csvEscape(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csvContent = rows
    .map((row) => row.map(csvEscape).join(";"))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export default function MonthlyApprovalPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const monthId = Array.isArray(params.monthId)
    ? params.monthId[0]
    : params.monthId;

  const [month, setMonth] = useState<PayrollMonth | null>(null);
  const [approvals, setApprovals] = useState<ApprovalEntry[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [variablePayEntries, setVariablePayEntries] = useState<
    VariablePayEntry[]
  >([]);
  const [documents, setDocuments] = useState<PayrollDocument[]>([]);
  const [northwindNotifications, setNorthwindNotifications] = useState<
    NorthwindNotification[]
  >([]);

  const [comment, setComment] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const totalHours = useMemo(
    () =>
      timeEntries.reduce(
        (sum, entry) => sum + Number(entry.totalHours || 0),
        0
      ),
    [timeEntries]
  );

  const totalVariablePay = useMemo(
    () =>
      variablePayEntries.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0
      ),
    [variablePayEntries]
  );

  async function loadApprovalData() {
    if (!companyId || !monthId) return;

    setLoading(true);
    setMessage("");

    try {
      const monthRef = doc(
        db,
        "companies",
        companyId,
        "payrollMonths",
        monthId
      );

      const monthSnapshot = await getDoc(monthRef);

      if (monthSnapshot.exists()) {
        const data = monthSnapshot.data();

        setMonth({
          id: monthSnapshot.id,
          month: data.month || "",
          year: data.year || 0,
          monthNumber: data.monthNumber || 0,
          status: data.status || "open",
          notes: data.notes || "",
        });
      }

      const approvalSnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "approvalLog"
        )
      );

      setApprovals(
        approvalSnapshot.docs.map((approvalDoc) => {
          const data = approvalDoc.data();

          return {
            id: approvalDoc.id,
            action: data.action || "",
            comment: data.comment || "",
            approvedBy: data.approvedBy || "",
          };
        })
      );

      const timeSnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "timeEntries"
        )
      );

      setTimeEntries(
        timeSnapshot.docs.map((entryDoc) => {
          const data = entryDoc.data();

          return {
            employeeName: data.employeeName || "",
            date: data.date || "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            breakMinutes: Number(data.breakMinutes || 0),
            totalHours: Number(data.totalHours || 0),
            comment: data.comment || "",
          };
        })
      );

      const variablePaySnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "variablePayEntries"
        )
      );

      setVariablePayEntries(
        variablePaySnapshot.docs.map((entryDoc) => {
          const data = entryDoc.data();

          return {
            employeeName: data.employeeName || "",
            type: data.type || "",
            label: data.label || "",
            amount: Number(data.amount || 0),
            taxable: Boolean(data.taxable),
            socialSecurityRelevant: Boolean(data.socialSecurityRelevant),
            comment: data.comment || "",
          };
        })
      );

      const documentSnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "documents"
        )
      );

      setDocuments(
        documentSnapshot.docs.map((documentDoc) => {
          const data = documentDoc.data();

          return {
            name: data.name || "",
            employeeName: data.employeeName || "",
            category: data.category || "",
            description: data.description || "",
          };
        })
      );

      const notificationSnapshot = await getDocs(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "northwindNotifications"
        )
      );

      setNorthwindNotifications(
        notificationSnapshot.docs.map((notificationDoc) => {
          const data = notificationDoc.data();

          return {
            id: notificationDoc.id,
            type: data.type || "",
            status: data.status || "",
            message: data.message || "",
            createdBy: data.createdBy || "",
          };
        })
      );
    } catch (error) {
      console.error(error);
      setMessage("Freigabedaten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function markReadyForApproval() {
    if (!companyId || !monthId) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", monthId),
        {
          status: "ready_for_approval",
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "approvalLog"
        ),
        {
          action: "ready_for_approval",
          comment: comment.trim() || "Payroll wurde zur Freigabe markiert.",
          approvedBy: approvedBy.trim() || "Northwind Payroll",
          createdAt: serverTimestamp(),
        }
      );

      setComment("");
      setMessage("Payroll wurde zur Freigabe markiert.");
      await loadApprovalData();
    } catch (error) {
      console.error(error);
      setMessage("Status konnte nicht auf Freigabe gesetzt werden.");
    } finally {
      setSaving(false);
    }
  }

  async function approvePayroll() {
    if (!companyId || !monthId) return;

    if (!approvedBy.trim()) {
      setMessage("Bitte Freigeber eintragen.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", monthId),
        {
          status: "approved",
          approvedBy: approvedBy.trim(),
          approvedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "approvalLog"
        ),
        {
          action: "approved",
          comment: comment.trim() || "Payroll wurde freigegeben.",
          approvedBy: approvedBy.trim(),
          createdAt: serverTimestamp(),
        }
      );

      setComment("");
      setMessage("Payroll wurde freigegeben.");
      await loadApprovalData();
    } catch (error) {
      console.error(error);
      setMessage("Payroll konnte nicht freigegeben werden.");
    } finally {
      setSaving(false);
    }
  }

  async function reopenPayroll() {
    if (!companyId || !monthId) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(db, "companies", companyId, "payrollMonths", monthId),
        {
          status: "in_progress",
          reopenedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "approvalLog"
        ),
        {
          action: "reopened",
          comment: comment.trim() || "Payroll wurde erneut geöffnet.",
          approvedBy: approvedBy.trim() || "Northwind Payroll",
          createdAt: serverTimestamp(),
        }
      );

      setComment("");
      setMessage("Payroll wurde erneut geöffnet.");
      await loadApprovalData();
    } catch (error) {
      console.error(error);
      setMessage("Payroll konnte nicht erneut geöffnet werden.");
    } finally {
      setSaving(false);
    }
  }

  async function notifyNorthwind() {
    if (!companyId || !monthId) return;

    const createdBy = approvedBy.trim() || "Kunde / Payroll User";

    setSaving(true);
    setMessage("");

    try {
      const notificationMessage = `Payroll-Monat ${monthId} wurde zur Bearbeitung an Northwind gemeldet. Status: ${
        statusLabels[month?.status || ""] || month?.status || "unbekannt"
      }. Stunden: ${Math.round(totalHours * 100) / 100}. Variable Zahlungen: ${formatCurrency(
        totalVariablePay
      )}. Dokumente: ${documents.length}.`;

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "northwindNotifications"
        ),
        {
          type: "monthly_payroll_info",
          status: "pending",
          recipient: "payroll@northwind-hr.de",
          companyId,
          monthId,
          monthName: `${month?.month || ""} ${month?.year || ""}`,
          payrollStatus: month?.status || "",
          totalHours,
          totalVariablePay,
          documentsCount: documents.length,
          timeEntriesCount: timeEntries.length,
          variablePayEntriesCount: variablePayEntries.length,
          approvalsCount: approvals.length,
          message: notificationMessage,
          comment: comment.trim(),
          createdBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      await addDoc(
        collection(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "approvalLog"
        ),
        {
          action: "northwind_notified",
          comment:
            comment.trim() ||
            "Northwind wurde über die monatlichen Payroll-Angaben informiert.",
          approvedBy: createdBy,
          createdAt: serverTimestamp(),
        }
      );

      setComment("");
      setMessage(
        "Northwind-Info wurde erstellt. Später kann daraus automatisch eine E-Mail versendet werden."
      );

      await loadApprovalData();
    } catch (error) {
      console.error(error);
      setMessage("Northwind-Info konnte nicht erstellt werden.");
    } finally {
      setSaving(false);
    }
  }

  function exportMonthlyCsv() {
    const rows: unknown[][] = [
      [
        "Bereich",
        "Mitarbeiter",
        "Datum/Art",
        "Bezeichnung",
        "Wert",
        "Zusatz",
        "Kommentar",
      ],
      [
        "Monat",
        "",
        monthId,
        `${month?.month || ""} ${month?.year || ""}`,
        statusLabels[month?.status || ""] || month?.status || "",
        "",
        month?.notes || "",
      ],
    ];

    timeEntries.forEach((entry) => {
      rows.push([
        "Stunden",
        entry.employeeName,
        entry.date,
        `${entry.startTime} - ${entry.endTime}`,
        String(entry.totalHours).replace(".", ","),
        `${entry.breakMinutes} Minuten Pause`,
        entry.comment,
      ]);
    });

    variablePayEntries.forEach((entry) => {
      rows.push([
        "Variable Zahlung",
        entry.employeeName,
        variablePayTypeLabels[entry.type] || entry.type,
        entry.label,
        String(entry.amount).replace(".", ","),
        `${entry.taxable ? "steuerpflichtig" : "steuerfrei"} / ${
          entry.socialSecurityRelevant ? "SV-pflichtig" : "SV-frei"
        }`,
        entry.comment,
      ]);
    });

    documents.forEach((document) => {
      rows.push([
        "Dokument",
        document.employeeName || "Firmenbezogen",
        documentCategoryLabels[document.category] || document.category,
        document.name,
        "",
        "",
        document.description,
      ]);
    });

    approvals.forEach((entry) => {
      rows.push([
        "Freigabe",
        entry.approvedBy,
        entry.action,
        "",
        "",
        "",
        entry.comment,
      ]);
    });

    downloadCsv(`payroll-export-${companyId}-${monthId}.csv`, rows);
  }

  function exportNorthwindSummaryCsv() {
    const rows: unknown[][] = [
      ["Payroll-Monat", monthId],
      ["Status", statusLabels[month?.status || ""] || month?.status || ""],
      ["Gesamtstunden", String(totalHours).replace(".", ",")],
      [
        "Variable Zahlungen gesamt",
        String(totalVariablePay).replace(".", ","),
      ],
      ["Dokumente", documents.length],
      ["Freigabe-Einträge", approvals.length],
      [],
      ["Bereich", "Anzahl", "Summe"],
      ["Stunden", timeEntries.length, String(totalHours).replace(".", ",")],
      [
        "Variable Zahlungen",
        variablePayEntries.length,
        String(totalVariablePay).replace(".", ","),
      ],
      ["Dokumente", documents.length, ""],
    ];

    downloadCsv(`northwind-summary-${companyId}-${monthId}.csv`, rows);
  }

  useEffect(() => {
    loadApprovalData();
  }, [companyId, monthId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Freigabemodul...
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

          <h1 className="text-3xl font-bold">Payroll Freigabe</h1>

          <p className="mt-1 text-gray-600">
            Monatsfreigabe, CSV-Export, Northwind-Info und Audit-Protokoll für
            den Payroll-Monat {monthId}.
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

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Payroll-Monat</p>
          <p className="mt-2 text-2xl font-bold">
            {month?.month} {month?.year}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Status</p>

          {month && (
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                statusStyles[month.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[month.status] || month.status}
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Stunden</p>
          <p className="mt-2 text-3xl font-bold">
            {Math.round(totalHours * 100) / 100}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Variable Zahlungen</p>
          <p className="mt-2 text-2xl font-bold">
            {formatCurrency(totalVariablePay)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Dokumente</p>
          <p className="mt-2 text-3xl font-bold">{documents.length}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Northwind Export & Info</h2>

        <p className="mt-1 text-sm text-gray-600">
          Hier können die monatlichen Payroll-Angaben exportiert oder zur
          weiteren Bearbeitung an Northwind gemeldet werden.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportMonthlyCsv}
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Vollständige Monats-CSV herunterladen
          </button>

          <button
            type="button"
            onClick={exportNorthwindSummaryCsv}
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-900 hover:bg-gray-200"
          >
            Northwind Kurzsummary herunterladen
          </button>

          <button
            type="button"
            onClick={notifyNorthwind}
            disabled={saving}
            className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Northwind informieren
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
          Aktuell wird bei „Northwind informieren“ ein Firestore-Datensatz
          erstellt. Der automatische E-Mail-Versand folgt im nächsten Schritt
          über Firebase Functions.
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Freigabe vorbereiten</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Freigeber / Bearbeiter
            </label>

            <input
              value={approvedBy}
              onChange={(event) => setApprovedBy(event.target.value)}
              placeholder="z. B. Roland Schrader oder Kunde Max Mustermann"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kommentar
            </label>

            <input
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="z. B. Input vollständig, Kunde hat final bestätigt"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-blue-900"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={markReadyForApproval}
            disabled={saving}
            className="rounded-xl bg-purple-50 px-5 py-3 font-medium text-purple-900 hover:bg-purple-100 disabled:opacity-50"
          >
            Zur Freigabe markieren
          </button>

          <button
            type="button"
            onClick={approvePayroll}
            disabled={saving}
            className="rounded-xl bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Payroll freigeben
          </button>

          <button
            type="button"
            onClick={reopenPayroll}
            disabled={saving}
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50"
          >
            Erneut öffnen
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Northwind-Infos</h2>

        {northwindNotifications.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Northwind-Info erstellt.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Typ</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Erstellt durch</th>
                  <th className="p-3 font-semibold">Nachricht</th>
                </tr>
              </thead>

              <tbody>
                {northwindNotifications.map((entry) => (
                  <tr key={entry.id} className="border-t align-top">
                    <td className="p-3 font-medium">{entry.type}</td>
                    <td className="p-3">{entry.status}</td>
                    <td className="p-3">{entry.createdBy || "-"}</td>
                    <td className="p-3">{entry.message || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Audit-Protokoll</h2>

        {approvals.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Freigabeaktion vorhanden.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Aktion</th>
                  <th className="p-3 font-semibold">Bearbeiter/Freigeber</th>
                  <th className="p-3 font-semibold">Kommentar</th>
                </tr>
              </thead>

              <tbody>
                {approvals.map((entry) => (
                  <tr key={entry.id} className="border-t align-top">
                    <td className="p-3 font-medium">
                      {entry.action === "ready_for_approval" &&
                        "Zur Freigabe markiert"}
                      {entry.action === "approved" && "Freigegeben"}
                      {entry.action === "reopened" && "Erneut geöffnet"}
                      {entry.action === "northwind_notified" &&
                        "Northwind informiert"}
                      {![
                        "ready_for_approval",
                        "approved",
                        "reopened",
                        "northwind_notified",
                      ].includes(entry.action) && entry.action}
                    </td>

                    <td className="p-3">{entry.approvedBy || "-"}</td>
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