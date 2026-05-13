"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Company = {
  companyName?: string;
  legalForm?: string;
  email?: string;
  phone?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  status?: string;
};

type User = {
  id: string;
  email?: string;
  displayName?: string;
  role?: string;
  companyId?: string;
  employeeId?: string;
  accessScope?: string;
};

const inputClass = "w-full rounded-xl border p-3";

const roles = [
  { value: "client_admin", label: "Mandanten Admin" },
  { value: "client_hr_admin", label: "HR Admin" },
  { value: "team_lead", label: "Team Lead" },
  { value: "employee", label: "Mitarbeiter" },
];

export default function CompanyAdminPage() {
  const params = useParams();
  const companyId = String(params.companyId);

  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const companySnap = await getDoc(doc(db, "companies", companyId));

      if (companySnap.exists()) {
        setCompany(companySnap.data() as Company);
      } else {
        setMessage("Mandant nicht gefunden.");
      }

      const usersSnap = await getDocs(
        query(collection(db, "users"), where("companyId", "==", companyId))
      );

      const userData = usersSnap.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data(),
      })) as User[];

      setUsers(userData);
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler beim Laden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [companyId]);

  function updateCompanyField(key: keyof Company, value: string) {
    setCompany((prev) => ({
      ...(prev || {}),
      [key]: value,
    }));
  }

  async function saveCompany() {
    if (!company) return;

    setSavingCompany(true);
    setMessage("");

    try {
      await updateDoc(doc(db, "companies", companyId), {
        ...company,
        updatedAt: new Date().toISOString(),
      });

      setMessage("Mandant gespeichert ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Speichern fehlgeschlagen: ${error.message}`);
    } finally {
      setSavingCompany(false);
    }
  }

  async function updateUserRole(user: User, role: string) {
    try {
      await updateDoc(doc(db, "users", user.id), {
        role,
        companyId,
        accessScope: role === "employee" ? "self" : "company",
        updatedAt: new Date().toISOString(),
      });

      setMessage("Rolle aktualisiert ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Rolle konnte nicht geändert werden: ${error.message}`);
    }
  }

  async function removeUserFromCompany(user: User) {
    const confirmed = window.confirm(
      `${user.email || "Benutzer"} wirklich vom Mandanten entfernen?`
    );

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        companyId: "",
        employeeId: "",
        accessScope: "",
        updatedAt: new Date().toISOString(),
      });

      setMessage("Benutzerzuordnung entfernt ✅");
      await loadData();
    } catch (error: any) {
      console.error(error);
      setMessage(`Benutzer konnte nicht entfernt werden: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-bold">Mandant verwalten</h1>
        <div className="rounded-2xl bg-white p-6 shadow">Lade Mandant...</div>
      </main>
    );
  }

  if (!company) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-bold">Mandant verwalten</h1>
        <p className="rounded-xl bg-red-50 p-4 text-red-700">
          {message || "Mandant nicht gefunden."}
        </p>
        <Link href="/dashboard/admin/companies" className="text-blue-900 underline">
          Zurück zur Mandantenübersicht
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mandant verwalten</h1>
          <p className="text-gray-600">
            Stammdaten, Status und Benutzerzuordnung verwalten.
          </p>
          <p className="mt-1 text-xs text-gray-500">Mandanten-ID: {companyId}</p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/dashboard/${companyId}`}
            className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-medium text-white"
          >
            Mandant öffnen
          </Link>

          <Link
            href="/dashboard/admin/companies"
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium"
          >
            Zurück
          </Link>
        </div>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Firmendaten</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Firmenname">
            <input
              className={inputClass}
              value={company.companyName || ""}
              onChange={(e) => updateCompanyField("companyName", e.target.value)}
            />
          </Field>

          <Field label="Rechtsform">
            <input
              className={inputClass}
              value={company.legalForm || ""}
              onChange={(e) => updateCompanyField("legalForm", e.target.value)}
            />
          </Field>

          <Field label="E-Mail">
            <input
              type="email"
              className={inputClass}
              value={company.email || ""}
              onChange={(e) => updateCompanyField("email", e.target.value)}
            />
          </Field>

          <Field label="Telefon">
            <input
              className={inputClass}
              value={company.phone || ""}
              onChange={(e) => updateCompanyField("phone", e.target.value)}
            />
          </Field>

          <Field label="Straße">
            <input
              className={inputClass}
              value={company.street || ""}
              onChange={(e) => updateCompanyField("street", e.target.value)}
            />
          </Field>

          <Field label="PLZ">
            <input
              className={inputClass}
              value={company.zip || ""}
              onChange={(e) => updateCompanyField("zip", e.target.value)}
            />
          </Field>

          <Field label="Ort">
            <input
              className={inputClass}
              value={company.city || ""}
              onChange={(e) => updateCompanyField("city", e.target.value)}
            />
          </Field>

          <Field label="Land">
            <input
              className={inputClass}
              value={company.country || ""}
              onChange={(e) => updateCompanyField("country", e.target.value)}
            />
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={company.status || "setup"}
              onChange={(e) => updateCompanyField("status", e.target.value)}
            >
              <option value="setup">Setup</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
            </select>
          </Field>
        </div>

        <button
          type="button"
          onClick={saveCompany}
          disabled={savingCompany}
          className="rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {savingCompany ? "Speichert..." : "Mandant speichern"}
        </button>
      </section>

      <section className="space-y-5 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Benutzer & Rollen</h2>
            <p className="text-sm text-gray-600">
              Benutzer dieses Mandanten anzeigen und Rollen ändern.
            </p>
          </div>

          <Link
            href={`/dashboard/admin/companies/${companyId}/users/new`}
            className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-medium text-white"
          >
            Benutzer zuordnen
          </Link>
        </div>

        {users.length === 0 ? (
          <p className="rounded-xl border p-5 text-gray-600">
            Noch keine Benutzer diesem Mandanten zugeordnet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Benutzer</th>
                  <th className="p-3 font-semibold">Rolle</th>
                  <th className="p-3 font-semibold">Zugriff</th>
                  <th className="p-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-medium">
                        {user.displayName || user.email || "Unbenannter Benutzer"}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">UID: {user.id}</p>
                    </td>

                    <td className="p-3">
                      <select
                        className="rounded border px-3 py-2 text-sm"
                        value={user.role || "client_admin"}
                        onChange={(e) => updateUserRole(user, e.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                        {user.accessScope || "-"}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeUserFromCompany(user)}
                        className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100"
                      >
                        Entfernen
                      </button>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}