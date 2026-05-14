"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type AppUser = {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  companyId?: string;
  employeeId?: string;
  accessScope?: string;
};

type Company = {
  id: string;
  companyName?: string;
};

const roles = [
  { value: "northwind_admin", label: "Northwind Admin" },
  { value: "client_admin", label: "Mandanten Admin" },
  { value: "client_hr_admin", label: "HR Admin" },
  { value: "team_lead", label: "Team Lead" },
  { value: "employee", label: "Mitarbeiter" },
];

const accessScopes = [
  { value: "all", label: "Alle Mandanten" },
  { value: "company", label: "Mandant" },
  { value: "team", label: "Team" },
  { value: "self", label: "Eigene Daten" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const usersSnap = await getDocs(
        query(collection(db, "users"), orderBy("email", "asc"))
      );

      const userData = usersSnap.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data(),
      })) as AppUser[];

      const companiesSnap = await getDocs(
        query(collection(db, "companies"), orderBy("companyName", "asc"))
      );

      const companyData = companiesSnap.docs.map((companyDoc) => ({
        id: companyDoc.id,
        ...companyDoc.data(),
      })) as Company[];

      setUsers(userData);
      setCompanies(companyData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Benutzer konnten nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateLocalUser(
    userId: string,
    key: keyof AppUser,
    value: string
  ) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              [key]: value,
            }
          : user
      )
    );
  }

  async function saveUser(user: AppUser) {
    setSavingId(user.id);
    setMessage("");

    try {
      const accessScope =
        user.role === "northwind_admin"
          ? "all"
          : user.role === "employee"
            ? "self"
            : user.accessScope || "company";

      await updateDoc(doc(db, "users", user.id), {
        displayName: user.displayName || "",
        role: user.role || "employee",
        companyId: user.role === "northwind_admin" ? "" : user.companyId || "",
        employeeId: user.employeeId || "",
        accessScope,
        updatedAt: new Date().toISOString(),
      });

      setMessage("Benutzer gespeichert ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Benutzer konnte nicht gespeichert werden: ${error.message}`);
    } finally {
      setSavingId("");
    }
  }

  async function removeCompany(user: AppUser) {
    const confirmed = window.confirm(
      `Mandantenzuordnung für ${user.email || "diesen Benutzer"} entfernen?`
    );

    if (!confirmed) return;

    setSavingId(user.id);
    setMessage("");

    try {
      await updateDoc(doc(db, "users", user.id), {
        companyId: "",
        employeeId: "",
        accessScope: user.role === "northwind_admin" ? "all" : "",
        updatedAt: new Date().toISOString(),
      });

      setMessage("Mandantenzuordnung entfernt ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Zuordnung konnte nicht entfernt werden: ${error.message}`);
    } finally {
      setSavingId("");
    }
  }

  async function deleteUser(user: AppUser) {
    const confirmed = window.confirm(
      `Benutzer ${user.email || user.id} wirklich vollständig löschen?\n\nDies entfernt:\n- Firebase Login\n- Firestore Benutzerprofil\n- Zugriff auf das Portal\n\nDie E-Mail ist danach wieder frei.`
    );

    if (!confirmed) return;

    setSavingId(user.id);
    setMessage("");

    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Benutzer konnte nicht gelöscht werden.");
      }

      setMessage("Benutzer wurde vollständig gelöscht ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Benutzer konnte nicht gelöscht werden.");
    } finally {
      setSavingId("");
    }
  }

  function getCompanyName(companyId?: string) {
    if (!companyId) return "-";

    return (
      companies.find((company) => company.id === companyId)?.companyName ||
      companyId
    );
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) =>
      [
        user.email,
        user.displayName,
        user.role,
        user.companyId,
        getCompanyName(user.companyId),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [users, search, companies]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>

        <section className="rounded-2xl bg-white p-6 shadow">
          Lade Benutzer...
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>

          <p className="text-gray-600">
            Rollen, Mandanten und Zugriffsbereiche zentral verwalten.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
          >
            Zurück
          </Link>

          <Link
            href="/dashboard/admin/companies"
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Mandanten
          </Link>
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            className="w-full rounded-xl border p-3 lg:max-w-md"
            placeholder="Benutzer suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            onClick={loadData}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Aktualisieren
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Keine Benutzer gefunden.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Benutzer</th>
                  <th className="p-3 font-semibold">Rolle</th>
                  <th className="p-3 font-semibold">Mandant</th>
                  <th className="p-3 font-semibold">Employee ID</th>
                  <th className="p-3 font-semibold">Zugriff</th>
                  <th className="p-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t align-top">
                    <td className="p-3">
                      <input
                        className="mb-2 w-full rounded border px-3 py-2"
                        value={user.displayName || ""}
                        onChange={(e) =>
                          updateLocalUser(
                            user.id,
                            "displayName",
                            e.target.value
                          )
                        }
                        placeholder="Name"
                      />

                      <p className="text-sm font-medium">
                        {user.email || "Keine E-Mail"}
                      </p>

                      <p className="text-xs text-gray-400">UID: {user.id}</p>
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded border px-3 py-2"
                        value={user.role || "employee"}
                        onChange={(e) =>
                          updateLocalUser(user.id, "role", e.target.value)
                        }
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded border px-3 py-2"
                        value={user.companyId || ""}
                        disabled={user.role === "northwind_admin"}
                        onChange={(e) =>
                          updateLocalUser(user.id, "companyId", e.target.value)
                        }
                      >
                        <option value="">Kein Mandant</option>

                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.companyName || company.id}
                          </option>
                        ))}
                      </select>

                      <p className="mt-2 text-xs text-gray-500">
                        Aktuell: {getCompanyName(user.companyId)}
                      </p>
                    </td>

                    <td className="p-3">
                      <input
                        className="w-full rounded border px-3 py-2"
                        value={user.employeeId || ""}
                        disabled={user.role === "northwind_admin"}
                        onChange={(e) =>
                          updateLocalUser(user.id, "employeeId", e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </td>

                    <td className="p-3">
                      <select
                        className="w-full rounded border px-3 py-2"
                        value={
                          user.role === "northwind_admin"
                            ? "all"
                            : user.accessScope || "company"
                        }
                        disabled={
                          user.role === "northwind_admin" ||
                          user.role === "employee"
                        }
                        onChange={(e) =>
                          updateLocalUser(
                            user.id,
                            "accessScope",
                            e.target.value
                          )
                        }
                      >
                        {accessScopes.map((scope) => (
                          <option key={scope.value} value={scope.value}>
                            {scope.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {user.companyId && user.role !== "northwind_admin" && (
                          <Link
                            href={`/dashboard/${user.companyId}`}
                            className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-800 hover:bg-blue-100"
                          >
                            Mandant öffnen
                          </Link>
                        )}

                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() => saveUser(user)}
                          className="rounded bg-blue-900 px-3 py-2 text-xs text-white hover:bg-blue-800 disabled:opacity-50"
                        >
                          {savingId === user.id ? "Speichert..." : "Speichern"}
                        </button>

                        {user.companyId && user.role !== "northwind_admin" && (
                          <button
                            type="button"
                            disabled={savingId === user.id}
                            onClick={() => removeCompany(user)}
                            className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Zuordnung entfernen
                          </button>
                        )}

                        {user.role !== "northwind_admin" && (
                          <button
                            type="button"
                            disabled={savingId === user.id}
                            onClick={() => deleteUser(user)}
                            className="rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Löschen
                          </button>
                        )}
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