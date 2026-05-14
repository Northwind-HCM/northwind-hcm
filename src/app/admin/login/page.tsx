"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function AdminLoginPage() {
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

      const firebaseUser = userCredential.user;

      const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

      if (!userSnap.exists()) {
        setMessage("Kein Benutzerprofil gefunden.");
        document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
        return;
      }

      const userData = userSnap.data();

      if (userData.role !== "northwind_admin") {
        setMessage("Dieser Zugang ist nicht für den Adminbereich freigegeben.");
        document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
        return;
      }

      document.cookie = `uid=${firebaseUser.uid}; path=/; max-age=604800; SameSite=Lax`;

      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error(error);
      setMessage("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
      document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
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
          <h1 className="text-2xl font-bold">Northwind Admin Login</h1>
          <p className="mt-1 text-sm text-gray-600">
            Interner Zugriff für Northwind Administratoren.
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