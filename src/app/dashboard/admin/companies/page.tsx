"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type Company = {
  id: string;
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  status?: "active" | "setup" | "inactive";
  createdAt?: string;
};

function getStatusLabel(status?: string) {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Inaktiv";
  return "Setup";
}

function getStatusClass(status?: string) {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "inactive") return "bg-gray-200 text-gray-700";
  return "bg-yellow-100 text-yellow-800";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setMessage("");

    try {
      const companiesQuery = query(
        collection(db, "companies"),
        orderBy("companyName", "asc")
      );

      const snapshot = await getDocs(companiesQuery);

      const data = snapshot.docs.map((companyDoc) => ({
        id: companyDoc.id,
        ...companyDoc.data(),
      })) as Company[];

      setCompanies(data);
    } catch (error: any) {
      console.error(error);
      setMessage(`Mandanten konnten nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createDemoCompany() {
    const confirmed = window.confirm(
      "Demo-Mandanten mit Testdaten erstellen?\n\nEs werden eine Demo GmbH, 10 Mitarbeiter, Aufgaben, Fehlzeiten und ein Payroll Cycle angelegt."
    );

    if (!confirmed) return;

    setCreatingDemo(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/seed-demo", {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Demo-Mandant konnte nicht erstellt werden.");
      }

      setMessage(`Demo-Mandant erstellt ✅ Company ID: ${data.companyId}`);
      await loadCompanies();
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Demo-Mandant konnte nicht erstellt werden.");
    } finally {
      setCreatingDemo(false);
    }
  }

  async function deleteCompany(company: Company) {
    const name = company.companyName || "diesen Mandanten";

    const confirmed = window.confirm(
      `${name} wirklich löschen?\n\nAchtung: Dies löscht nur den Mandanten-Datensatz. Unterdaten wie Mitarbeiter, Benutzerzuordnungen oder Dokumente sollten später über eine saubere Archiv-/Löschlogik behandelt werden.`
    );

    if (!confirmed) return;

    setDeletingId(company.id);
    setMessage("");

    try {
      await deleteDoc(doc(db, "companies", company.id));
      setMessage("Mandant gelöscht ✅");
      await loadCompanies();
    } catch (error: any) {
      console.error(error);
      setMessage(`Mandant konnte nicht gelöscht werden: ${error.message}`);
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return companies;

    return companies.filter((company) =>
      [company.companyName, company.email, company.phone, company.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [companies, search]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Mandanten</h1>

        <div className="rounded-2xl bg-white p-6 shadow">
          Lade Mandanten...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mandanten</h1>

          <p className="text-gray-600">
            Firmen verwalten, Demo-Daten erzeugen und Portale vorbereiten.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-gray-100 px-5 py-3 font-medium text-gray-800 hover:bg-gray-200"
          >
            Zurück
          </Link>

          <button
            type="button"
            disabled={creatingDemo}
            onClick={createDemoCompany}
            className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {creatingDemo ? "Erstellt Demo..." : "Demo-Mandant erstellen"}
          </button>

          <Link
            href="/dashboard/admin/companies/new"
            className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Mandant anlegen
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
            placeholder="Mandant suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            onClick={loadCompanies}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Aktualisieren
          </button>
        </div>

        {filteredCompanies.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Keine Mandanten gefunden.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-semibold">Mandant</th>
                  <th className="p-3 font-semibold">Kontakt</th>
                  <th className="p-3 font-semibold">Ort</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Aktionen</th>
                </tr>
              </thead>

              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-medium">
                        {company.companyName || "Unbenannter Mandant"}
                      </p>

                      <p className="text-xs text-gray-500">ID: {company.id}</p>
                    </td>

                    <td className="p-3">
                      {company.email ? (
                        <p>{company.email}</p>
                      ) : (
                        <p className="text-gray-400">Keine E-Mail</p>
                      )}

                      {company.phone && (
                        <p className="text-xs text-gray-500">
                          {company.phone}
                        </p>
                      )}
                    </td>

                    <td className="p-3">
                      {company.city || (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          company.status
                        )}`}
                      >
                        {getStatusLabel(company.status)}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/dashboard/${company.id}`}
                          className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-800 hover:bg-blue-100"
                        >
                          Öffnen
                        </Link>

                        <Link
                          href={`/dashboard/admin/companies/${company.id}`}
                          className="rounded bg-gray-100 px-3 py-2 text-xs hover:bg-gray-200"
                        >
                          Verwalten
                        </Link>

                        <button
                          type="button"
                          disabled={deletingId === company.id}
                          onClick={() => deleteCompany(company)}
                          className="rounded bg-red-50 px-3 py-2 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === company.id ? "Löscht..." : "Löschen"}
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