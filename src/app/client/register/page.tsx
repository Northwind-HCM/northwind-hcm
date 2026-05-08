"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function ClientRegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const user = userCredential.user;

      const companyRef = await addDoc(collection(db, "companies"), {
        companyName,
        contactName,
        email: cleanEmail,
        ownerId: user.uid,
        status: "onboarding",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", user.uid), {
        userId: user.uid,
        email: cleanEmail,
        role: "client_admin",
        companyId: companyRef.id,
        createdAt: serverTimestamp(),
      });

   window.location.href = `/dashboard/${companyRef.id}`;
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold">Mandanten-Registrierung</h1>
          <p className="mt-1 text-sm text-gray-600">
            Legen Sie den Zugang für Ihr Unternehmen im Northwind Payroll Portal an.
          </p>
        </div>

        <input
          className="w-full rounded border p-3"
          placeholder="Firmenname"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        <input
          className="w-full rounded border p-3"
          placeholder="Ansprechpartner"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
        />

        <input
          className="w-full rounded border p-3"
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full rounded border p-3"
          type="password"
          placeholder="Passwort festlegen"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-900 px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Registriert..." : "Registrieren"}
        </button>

        {message && <p className="text-sm text-red-700">{message}</p>}
      </form>
    </main>
  );
}