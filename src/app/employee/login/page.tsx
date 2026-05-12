"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserData = {
  role?: string;
  companyId?: string;
  employeeId?: string;
};



export default function EmployeeLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      const credential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const uid = credential.user.uid;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("Für diesen Benutzer wurde kein Benutzerprofil gefunden.");
        document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
        return;
      }

      const userData = userSnap.data() as UserData;

      if (userData.role !== "employee") {
        setError("Dieser Login ist nur für Mitarbeiter vorgesehen.");
        document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
        return;
      }

      if (!userData.companyId || !userData.employeeId) {
        setError("Dem Benutzer sind noch keine Mitarbeiterdaten zugeordnet.");
        document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
        return;
      }

      document.cookie = `uid=${uid}; path=/; max-age=604800; SameSite=Lax`;

      window.location.href = `/employee/self-service/${userData.companyId}/${userData.employeeId}`;
    } catch (err) {
      console.error(err);
      setError("Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen.");
      document.cookie = "uid=; path=/; max-age=0; SameSite=Lax";
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">Mitarbeiter Login</h1>

        <p className="mt-2 text-sm text-gray-600">
          Bitte melden Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort an.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="email"
            required
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />

          <input
            type="password"
            required
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border px-4 py-3"
          />

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-900 px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {loading ? "Login läuft..." : "Einloggen"}
          </button>
        </form>
      </div>
    </main>
  );
}