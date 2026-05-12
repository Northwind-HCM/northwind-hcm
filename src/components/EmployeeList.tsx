"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Props = {
  companyId: string;
};

type Employee = {
  id: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  portalAccess?: boolean;
  portalStatus?: "not_invited" | "invited" | "active";
  inviteStatus?: "not_invited" | "invited" | "active";
  invitedAt?: string;
  inviteLastSentAt?: string;
  registeredAt?: string;

  status?: "draft" | "incomplete" | "complete" | "archived";
  missingFields?: string[];
  archivedAt?: string;
};

function getPortalStatus(employee: Employee) {
  return employee.portalStatus || employee.inviteStatus || "not_invited";
}

function getPortalLabel(status?: string) {
  if (status === "active") return "Portal aktiv";
  if (status === "invited") return "Einladung offen";
  return "Kein Zugang";
}

function getPortalClass(status?: string) {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "invited") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-700";
}

function getPayrollLabel(status?: string) {
  if (status === "complete") return "Vollständig";
  if (status === "incomplete") return "Unvollständig";
  if (status === "draft") return "Entwurf";
  if (status === "archived") return "Archiviert";
  return "Unbekannt";
}

function getPayrollClass(status?: string) {
  if (status === "complete") return "bg-green-100 text-green-800";
  if (status === "incomplete") return "bg-yellow-100 text-yellow-800";
  if (status === "draft") return "bg-orange-100 text-orange-800";
  if (status === "archived") return "bg-gray-200 text-gray-700";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function getInviteButtonLabel(employee: Employee) {
  const portalStatus = getPortalStatus(employee);

  if (portalStatus === "invited") return "Einladung erneut senden";
  return "Einladung senden";
}

export default function EmployeeList({ companyId }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);

  async function loadEmployees() {
    setLoading(true);

    try {
      const q = query(
        collection(db, "companies", companyId, "employees"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map((employeeDoc) => ({
        id: employeeDoc.id,
        ...employeeDoc.data(),
      })) as Employee[];

      setEmployees(data);
    } catch (error) {
      console.error(error);
      alert("Mitarbeiter konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  async function inviteEmployee(employee: Employee) {
    if (!employee.email) {
      alert("Keine E-Mail-Adresse vorhanden.");
      return;
    }

    const portalStatus = getPortalStatus(employee);

    if (portalStatus === "active") {
      alert("Dieser Mitarbeiter hat bereits einen aktiven Portalzugang.");
      return;
    }

    setSendingInviteId(employee.id);

    try {
      const response = await fetch("/api/invite-employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId,
          employeeId: employee.id,
          email: employee.email,
          firstName: employee.firstName || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Einladung fehlgeschlagen.");
        return;
      }

      alert(
        portalStatus === "invited"
          ? "Einladung wurde erneut versendet ✅"
          : "Einladung wurde erfolgreich versendet ✅"
      );

      await loadEmployees();
    } catch (error) {
      console.error(error);
      alert("Fehler beim Senden der Einladung.");
    } finally {
      setSendingInviteId(null);
    }
  }

  async function archiveEmployee(employee: Employee) {
    const name =
      `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
      "diesen Mitarbeiter";

    const confirmed = window.confirm(
      `${name} wirklich archivieren? Der Mitarbeiter wird nicht gelöscht, sondern aus der aktiven Übersicht entfernt.`
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "companies", companyId, "employees", employee.id), {
        status: "archived",
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await loadEmployees();
    } catch (error) {
      console.error(error);
      alert("Archivieren fehlgeschlagen.");
    }
  }

  async function restoreEmployee(employee: Employee) {
    try {
      await updateDoc(doc(db, "companies", companyId, "employees", employee.id), {
        status:
          employee.missingFields && employee.missingFields.length > 0
            ? "incomplete"
            : "complete",
        archivedAt: "",
        updatedAt: new Date().toISOString(),
      });

      await loadEmployees();
    } catch (error) {
      console.error(error);
      alert("Wiederherstellen fehlgeschlagen.");
    }
  }

  useEffect(() => {
    loadEmployees();
  }, [companyId]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const isArchived = employee.status === "archived";

      if (filter === "active" && isArchived) return false;
      if (filter === "archived" && !isArchived) return false;

      if (!term) return true;

      const searchable = [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.employeeNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [employees, filter, search]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow">
        Lade Mitarbeiter...
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Mitarbeiterübersicht</h2>
          <p className="text-sm text-gray-500">
            {filteredEmployees.length} angezeigt / {employees.length} gesamt
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("active")}
            className={`rounded-lg px-4 py-2 text-sm ${
              filter === "active"
                ? "bg-blue-900 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Aktiv
          </button>

          <button
            type="button"
            onClick={() => setFilter("archived")}
            className={`rounded-lg px-4 py-2 text-sm ${
              filter === "archived"
                ? "bg-blue-900 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Archiviert
          </button>

          <button
            type="button"
            onClick={loadEmployees}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      <input
        className="w-full rounded-lg border p-3"
        placeholder="Mitarbeiter suchen..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {filteredEmployees.length === 0 ? (
        <p className="rounded-xl border p-6 text-gray-600">
          Keine Mitarbeiter gefunden.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 font-semibold">Mitarbeiter</th>
                <th className="p-3 font-semibold">Kontakt</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold">Portalzugang</th>
                <th className="p-3 font-semibold">Fehlende Angaben</th>
                <th className="p-3 font-semibold text-right">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {filteredEmployees.map((employee) => {
                const fullName =
                  `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                  "Unbenannter Mitarbeiter";

                const portalStatus = getPortalStatus(employee);
                const inviteDate =
                  formatDate(employee.inviteLastSentAt) ||
                  formatDate(employee.invitedAt);
                const registeredDate = formatDate(employee.registeredAt);

                return (
                  <tr key={employee.id} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-medium">{fullName}</p>
                      {employee.employeeNumber && (
                        <p className="text-xs text-gray-500">
                          Personalnr.: {employee.employeeNumber}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      {employee.email ? (
                        <p>{employee.email}</p>
                      ) : (
                        <p className="text-gray-400">Keine E-Mail</p>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getPayrollClass(
                          employee.status
                        )}`}
                      >
                        {getPayrollLabel(employee.status)}
                      </span>
                    </td>

                    <td className="space-y-1 p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getPortalClass(
                          portalStatus
                        )}`}
                      >
                        {getPortalLabel(portalStatus)}
                      </span>

                      {portalStatus === "invited" && inviteDate && (
                        <p className="text-xs text-gray-500">
                          versendet am {inviteDate}
                        </p>
                      )}

                      {portalStatus === "active" && registeredDate && (
                        <p className="text-xs text-gray-500">
                          aktiv seit {registeredDate}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      {employee.missingFields && employee.missingFields.length > 0 ? (
                        <p className="max-w-md text-xs text-yellow-800">
                          {employee.missingFields.join(", ")}
                        </p>
                      ) : (
                        <p className="text-xs text-green-700">
                          Keine fehlenden Pflichtangaben
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {employee.status !== "archived" && (
                          <>
                            {portalStatus !== "active" && (
                              <button
                                type="button"
                                onClick={() => inviteEmployee(employee)}
                                disabled={sendingInviteId === employee.id}
                                className="rounded bg-blue-900 px-3 py-2 text-xs text-white hover:bg-blue-800 disabled:opacity-50"
                              >
                                {sendingInviteId === employee.id
                                  ? "Sendet..."
                                  : getInviteButtonLabel(employee)}
                              </button>
                            )}

                            <Link
                              href={`/dashboard/${companyId}/employees/${employee.id}`}
                              className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200"
                            >
                              Bearbeiten
                            </Link>

                            <button
                              type="button"
                              onClick={() => archiveEmployee(employee)}
                              className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                            >
                              Archivieren
                            </button>
                          </>
                        )}

                        {employee.status === "archived" && (
                          <button
                            type="button"
                            onClick={() => restoreEmployee(employee)}
                            className="rounded bg-green-50 px-3 py-2 text-xs text-green-700 hover:bg-green-100"
                          >
                            Wiederherstellen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}