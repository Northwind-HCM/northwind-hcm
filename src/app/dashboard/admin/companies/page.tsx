"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
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
  const [search, setSearch] = useState("");

  async function loadCompanies() {
    setLoading(true);

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
    } catch (error) {
      console.error(error);
      alert("Mandanten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return companies;

    return companies.filter((company) =>
      [
        company.companyName,
        company.email,
        company.phone,
        company.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [companies, search]);

  if (loading) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-bold">Mandanten</h1>
        <div className="rounded-2xl bg-white p-6 shadow">
          Lade Mandanten...
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mandanten</h1>
          <p className="text-gray-600">
            Firmen verwalten, neue Mandanten anlegen und Portale vorbereiten.
          </p>
        </div>

        <Link
          href="/dashboard/admin/companies/new"
          className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
        >
          Mandant anlegen
        </Link>
      </div>

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
                      <p className="text-xs text-gray-500">
                        ID: {company.id}
                      </p>
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
                      <div className="flex justify-end gap-2">
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