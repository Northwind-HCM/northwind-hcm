"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const user = userCredential.user;

      document.cookie = `uid=${user.uid}; path=/; max-age=86400; SameSite=Lax`;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setMessage("Kein Mandantenprofil gefunden.");
        document.cookie = "uid=; path=/; max-age=0";
        return;
      }

      const userData = userSnap.data();

      if (userData.role !== "client_admin") {
        setMessage("Dieser Zugang ist kein Mandanten-Admin.");
        document.cookie = "uid=; path=/; max-age=0";
        return;
      }

      if (!userData.companyId) {
        setMessage("Keine Company ID im Mandantenprofil gefunden.");
        document.cookie = "uid=; path=/; max-age=0";
        return;
      }

      window.location.href = `/dashboard/${userData.companyId}`;
    } catch (error: any) {
      console.error(error);
      setMessage(`Fehler: ${error.message}`);
      document.cookie = "uid=; path=/; max-age=0";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold">Mandanten Login</h1>
          <p className="mt-1 text-sm text-gray-600">
            Melden Sie sich im Northwind Payroll Portal an.
          </p>
        </div>

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
          placeholder="Passwort"
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
          {loading ? "Meldet an..." : "Einloggen"}
        </button>

        {message && <p className="text-sm text-red-700">{message}</p>}
      </form>
    </main>
  );
}