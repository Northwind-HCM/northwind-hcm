"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CompanyFormComponent() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("Speicher-Vorgang gestartet...");

    try {
const result = await addDoc(collection(db, "companies"), {
  companyName,
  email,
  createdAt: serverTimestamp(),
  status: "active"
      });

      setMessage(`Gespeichert ✅ ID: ${result.id}`);
      setCompanyName("");
      setEmail("");
    } catch (error: any) {
      console.error("Firebase Fehler:", error);
      setMessage(`Fehler beim Speichern ❌ ${error?.message || "Unbekannter Fehler"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl bg-white p-6 shadow"
    >
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Unternehmensdaten</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="rounded border p-3"
            placeholder="Firmenname"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />

          <input
            className="rounded border p-3"
            placeholder="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-900 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Speichern"}
        </button>

        {message && <p className="text-sm text-gray-700">{message}</p>}
      </div>
    </form>
  );
}