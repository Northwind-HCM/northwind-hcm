"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getCurrentAppUser } from "@/lib/currentUser";
import { canViewNorthwindInbox, type AppUser } from "@/lib/rbac";

type NorthwindNotification = {
  id: string;
  monthId: string;
  monthName: string;
  type: string;
  status: "pending" | "in_review" | "done";
  message: string;
  comment: string;
  createdBy: string;
  payrollStatus: string;
  totalHours: number;
  totalVariablePay: number;
  documentsCount: number;
  timeEntriesCount: number;
  variablePayEntriesCount: number;
  approvalsCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const statusLabels: Record<string, string> = {
  pending: "Neu",
  in_review: "In Prüfung",
  done: "Erledigt",
};

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900",
  in_review: "bg-blue-100 text-blue-900",
  done: "bg-green-100 text-green-900",
};

export default function NorthwindInboxPage() {
  const params = useParams();

  const companyId = Array.isArray(params.companyId)
    ? params.companyId[0]
    : params.companyId;

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [allowed, setAllowed] = useState(false);

  const [notifications, setNotifications] = useState<NorthwindNotification[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const pendingCount = useMemo(
    () => notifications.filter((item) => item.status === "pending").length,
    [notifications]
  );

  const inReviewCount = useMemo(
    () => notifications.filter((item) => item.status === "in_review").length,
    [notifications]
  );

  const doneCount = useMemo(
    () => notifications.filter((item) => item.status === "done").length,
    [notifications]
  );

  async function loadNotifications() {
    if (!companyId) return;

    setMessage("");

    try {
      const payrollMonthsSnapshot = await getDocs(
        collection(db, "companies", companyId, "payrollMonths")
      );

      const allNotifications: NorthwindNotification[] = [];

      for (const monthDoc of payrollMonthsSnapshot.docs) {
        const notificationSnapshot = await getDocs(
          collection(
            db,
            "companies",
            companyId,
            "payrollMonths",
            monthDoc.id,
            "northwindNotifications"
          )
        );

        notificationSnapshot.docs.forEach((notificationDoc) => {
          const data = notificationDoc.data();

          allNotifications.push({
            id: notificationDoc.id,
            monthId: monthDoc.id,
            monthName: data.monthName || monthDoc.id,
            type: data.type || "",
            status: data.status || "pending",
            message: data.message || "",
            comment: data.comment || "",
            createdBy: data.createdBy || "",
            payrollStatus: data.payrollStatus || "",
            totalHours: Number(data.totalHours || 0),
            totalVariablePay: Number(data.totalVariablePay || 0),
            documentsCount: Number(data.documentsCount || 0),
            timeEntriesCount: Number(data.timeEntriesCount || 0),
            variablePayEntriesCount: Number(data.variablePayEntriesCount || 0),
            approvalsCount: Number(data.approvalsCount || 0),
          });
        });
      }

      allNotifications.sort((a, b) => b.monthId.localeCompare(a.monthId));

      setNotifications(allNotifications);
    } catch (error) {
      console.error(error);
      setMessage("Northwind-Inbox konnte nicht geladen werden.");
    }
  }

  async function updateNotificationStatus(
    monthId: string,
    notificationId: string,
    status: "pending" | "in_review" | "done"
  ) {
    if (!companyId || !allowed) return;

    setSaving(true);
    setMessage("");

    try {
      await updateDoc(
        doc(
          db,
          "companies",
          companyId,
          "payrollMonths",
          monthId,
          "northwindNotifications",
          notificationId
        ),
        {
          status,
          updatedAt: serverTimestamp(),
          updatedBy: appUser?.uid || "",
        }
      );

      setMessage("Status wurde aktualisiert.");

      await loadNotifications();
    } catch (error) {
      console.error(error);
      setMessage("Status konnte nicht aktualisiert werden.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          window.location.href = "/login";
          return;
        }

        const user = await getCurrentAppUser();

        setAppUser(user);

        const hasAccess = canViewNorthwindInbox(user);

        setAllowed(hasAccess);

        if (hasAccess) {
          await loadNotifications();
        }
      } catch (error) {
        console.error(error);
        setMessage("Zugriff konnte nicht geprüft werden.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [companyId]);

  if (loading) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Northwind-Inbox...
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-medium text-red-700">Zugriff verweigert</p>

          <h1 className="mt-2 text-2xl font-bold">
            Keine Berechtigung für die Northwind-Inbox
          </h1>

          <p className="mt-2 text-gray-600">
            Diese Seite ist nur für Benutzer mit der Rolle{" "}
            <span className="font-semibold">northwind_admin</span> sichtbar.
          </p>

          <Link
            href={`/dashboard/${companyId}`}
            className="mt-6 inline-block rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Zurück zum Dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-900">
            Northwind Operations
          </p>

          <h1 className="text-3xl font-bold">Northwind-Inbox</h1>

          <p className="mt-1 text-gray-600">
            Eingegangene monatliche Payroll-Informationen, Freigaben und
            Kundenmeldungen.
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

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Meldungen</p>
          <p className="mt-2 text-3xl font-bold">{notifications.length}</p>
        </div>

        <div className="rounded-2xl bg-yellow-50 p-5 text-yellow-900 shadow">
          <p className="text-sm opacity-75">Neu</p>
          <p className="mt-2 text-3xl font-bold">{pendingCount}</p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-5 text-blue-900 shadow">
          <p className="text-sm opacity-75">In Prüfung</p>
          <p className="mt-2 text-3xl font-bold">{inReviewCount}</p>
        </div>

        <div className="rounded-2xl bg-green-50 p-5 text-green-900 shadow">
          <p className="text-sm opacity-75">Erledigt</p>
          <p className="mt-2 text-3xl font-bold">{doneCount}</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Eingegangene Meldungen</h2>

        {notifications.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-gray-500">
            Noch keine Northwind-Informationen vorhanden.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Monat</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Erstellt durch</th>
                  <th className="p-3 font-semibold">Stunden</th>
                  <th className="p-3 font-semibold">Variable Zahlungen</th>
                  <th className="p-3 font-semibold">Dokumente</th>
                  <th className="p-3 font-semibold">Nachricht</th>
                  <th className="p-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {notifications.map((entry) => (
                  <tr
                    key={`${entry.monthId}-${entry.id}`}
                    className="border-t align-top"
                  >
                    <td className="p-3">
                      <p className="font-medium">{entry.monthName}</p>
                      <p className="text-xs text-gray-500">{entry.monthId}</p>
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[entry.status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statusLabels[entry.status] || entry.status}
                      </span>
                    </td>

                    <td className="p-3">{entry.createdBy || "-"}</td>

                    <td className="p-3">
                      <p className="font-medium">{entry.totalHours}</p>
                      <p className="text-xs text-gray-500">
                        {entry.timeEntriesCount} Eintrag/Einträge
                      </p>
                    </td>

                    <td className="p-3">
                      <p className="font-medium">
                        {formatCurrency(entry.totalVariablePay)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {entry.variablePayEntriesCount} Eintrag/Einträge
                      </p>
                    </td>

                    <td className="p-3">{entry.documentsCount}</td>

                    <td className="p-3">{entry.message}</td>

                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateNotificationStatus(
                              entry.monthId,
                              entry.id,
                              "in_review"
                            )
                          }
                          disabled={saving}
                          className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
                        >
                          In Prüfung
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateNotificationStatus(
                              entry.monthId,
                              entry.id,
                              "done"
                            )
                          }
                          disabled={saving}
                          className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
                        >
                          Erledigt
                        </button>
                      </div>
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