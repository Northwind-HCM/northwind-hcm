"use client";

import { useEffect, useState } from "react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthActionPage() {
  const [mode, setMode] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode") || "";
      const codeParam = params.get("oobCode") || "";

      setMode(modeParam);
      setOobCode(codeParam);

      if (modeParam !== "resetPassword" || !codeParam) {
        setMessage("Ungültiger oder unvollständiger Link.");
        setLoading(false);
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, codeParam);
        setEmail(verifiedEmail);
      } catch (error: any) {
        console.error(error);
        setMessage(
          "Dieser Link ist ungültig, abgelaufen oder wurde bereits verwendet."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!password || password.length < 8) {
      setMessage("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    if (password !== passwordRepeat) {
      setMessage("Die Passwörter stimmen nicht überein.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await confirmPasswordReset(auth, oobCode, password);

      setMessage("Passwort wurde gesetzt ✅ Sie können sich jetzt einloggen.");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (error: any) {
      console.error(error);
      setMessage(
        error.message || "Passwort konnte nicht gesetzt werden."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          Prüfe Link...
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <section className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold">Passwort festlegen</h1>

          <p className="mt-1 text-sm text-gray-600">
            Legen Sie Ihr Passwort für den Northwind Zugang fest.
          </p>
        </div>

        {email && (
          <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
            Zugang: {email}
          </p>
        )}

        {mode === "resetPassword" && oobCode && !message.includes("ungültig") ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              className="w-full rounded-xl border p-3"
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <input
              type="password"
              className="w-full rounded-xl border p-3"
              placeholder="Passwort wiederholen"
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
              minLength={8}
              required
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Speichert..." : "Passwort speichern"}
            </button>
          </form>
        ) : null}

        {message && (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
            {message}
          </p>
        )}

        <a
          href="/login"
          className="block text-center text-sm font-medium text-blue-900 underline"
        >
          Zur Login-Auswahl
        </a>
      </section>
    </main>
  );
}