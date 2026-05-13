"use client";

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

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "rejected";

type Lead = {
  id: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  employees?: string;
  currentPayroll?: string;
  interest?: string;
  desiredStart?: string;
  message?: string;
  status?: LeadStatus;
  source?: string;
  createdAtIso?: string;
  updatedAt?: string;
};

const statusOptions: { value: LeadStatus | "all"; label: string }[] = [
  { value: "new", label: "Neu" },
  { value: "contacted", label: "Kontaktiert" },
  { value: "qualified", label: "Qualifiziert" },
  { value: "converted", label: "Gewonnen" },
  { value: "rejected", label: "Abgelehnt" },
  { value: "all", label: "Alle" },
];

function getStatusLabel(status?: string) {
  if (status === "contacted") return "Kontaktiert";
  if (status === "qualified") return "Qualifiziert";
  if (status === "converted") return "Gewonnen";
  if (status === "rejected") return "Abgelehnt";
  return "Neu";
}

function getStatusClass(status?: string) {
  if (status === "converted") return "bg-green-100 text-green-800";
  if (status === "qualified") return "bg-blue-100 text-blue-800";
  if (status === "contacted") return "bg-yellow-100 text-yellow-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("new");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function loadLeads() {
    setLoading(true);
    setMessage("");

    try {
      const leadsQuery = query(
        collection(db, "earlyAccessLeads"),
        orderBy("createdAtIso", "desc")
      );

      const snapshot = await getDocs(leadsQuery);

      const data = snapshot.docs.map((leadDoc) => ({
        id: leadDoc.id,
        ...leadDoc.data(),
      })) as Lead[];

      setLeads(data);
    } catch (error: any) {
      console.error(error);
      setMessage(`Leads konnten nicht geladen werden: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(lead: Lead, status: LeadStatus) {
    try {
      await updateDoc(doc(db, "earlyAccessLeads", lead.id), {
        status,
        updatedAt: new Date().toISOString(),
      });

      setMessage("Leadstatus aktualisiert ✅");
      await loadLeads();
    } catch (error: any) {
      console.error(error);
      setMessage(`Status konnte nicht geändert werden: ${error.message}`);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();

    return leads.filter((lead) => {
      if (statusFilter !== "all" && (lead.status || "new") !== statusFilter) {
        return false;
      }

      if (!term) return true;

      const searchable = [
        lead.companyName,
        lead.contactName,
        lead.email,
        lead.phone,
        lead.interest,
        lead.currentPayroll,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [leads, statusFilter, search]);

  const counts = {
    new: leads.filter((lead) => (lead.status || "new") === "new").length,
    contacted: leads.filter((lead) => lead.status === "contacted").length,
    qualified: leads.filter((lead) => lead.status === "qualified").length,
    converted: leads.filter((lead) => lead.status === "converted").length,
    rejected: leads.filter((lead) => lead.status === "rejected").length,
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-bold">Early Access Leads</h1>
        <div className="rounded-2xl bg-white p-6 shadow">Lade Leads...</div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Early Access Leads</h1>
          <p className="text-gray-600">
            Anfragen aus dem Early-Access-Formular verwalten und qualifizieren.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeads}
          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
        >
          Aktualisieren
        </button>
      </div>

      {message && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-5">
        <LeadCount label="Neu" value={counts.new} />
        <LeadCount label="Kontaktiert" value={counts.contacted} />
        <LeadCount label="Qualifiziert" value={counts.qualified} />
        <LeadCount label="Gewonnen" value={counts.converted} />
        <LeadCount label="Abgelehnt" value={counts.rejected} />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <input
            className="w-full rounded-xl border p-3 lg:max-w-md"
            placeholder="Firma, Kontakt, E-Mail suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  statusFilter === option.value
                    ? "bg-blue-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <p className="rounded-xl border p-6 text-gray-600">
            Keine passenden Leads gefunden.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {lead.companyName || "Unbekannte Firma"}
                      </h2>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          lead.status
                        )}`}
                      >
                        {getStatusLabel(lead.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-600">
                      {lead.contactName || "-"} · {lead.email || "-"}
                      {lead.phone ? ` · ${lead.phone}` : ""}
                    </p>

                    <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                      <p>
                        <span className="font-medium">Mitarbeiter:</span>{" "}
                        {lead.employees || "-"}
                      </p>
                      <p>
                        <span className="font-medium">Interesse:</span>{" "}
                        {lead.interest || "-"}
                      </p>
                      <p>
                        <span className="font-medium">Payroll aktuell:</span>{" "}
                        {lead.currentPayroll || "-"}
                      </p>
                      <p>
                        <span className="font-medium">Start:</span>{" "}
                        {lead.desiredStart || "-"}
                      </p>
                    </div>

                    {lead.message && (
                      <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                        {lead.message}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-gray-500">
                      Eingang: {formatDate(lead.createdAtIso)} · Lead-ID:{" "}
                      {lead.id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <a
                      href={`mailto:${lead.email || ""}?subject=Ihre%20Early%20Access%20Anfrage%20bei%20Northwind%20HCM`}
                      className="rounded bg-blue-900 px-3 py-2 text-xs text-white hover:bg-blue-800"
                    >
                      Antworten
                    </a>

                    <select
                      className="rounded border px-3 py-2 text-xs"
                      value={lead.status || "new"}
                      onChange={(e) =>
                        updateLeadStatus(lead, e.target.value as LeadStatus)
                      }
                    >
                      <option value="new">Neu</option>
                      <option value="contacted">Kontaktiert</option>
                      <option value="qualified">Qualifiziert</option>
                      <option value="converted">Gewonnen</option>
                      <option value="rejected">Abgelehnt</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function LeadCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-blue-900">{value}</p>
    </div>
  );
}