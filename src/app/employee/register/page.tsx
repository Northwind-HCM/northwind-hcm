"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

function EmployeeRegisterContent() {
  const params = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [employee, setEmployee] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadEmployee() {
      setLoading(true);

      if (!token) {
        setMessage("Kein Einladungs-Token gefunden.");
        setLoading(false);
        return;
      }

      try {
        const companiesSnap = await getDocs(collection(db, "companies"));

        for (const company of companiesSnap.docs) {
          const employeesSnap = await getDocs(
            query(
              collection(db, "companies", company.id, "employees"),
              where("inviteToken", "==", token)
            )
          );

          if (!employeesSnap.empty) {
            const emp = employeesSnap.docs[0];
            const employeeData = emp.data();

            if (
              employeeData.inviteStatus === "active" ||
              employeeData.portalStatus === "active" ||
              employeeData.invitationAccepted === true
            ) {
              setMessage(
                "Diese Einladung wurde bereits angenommen. Bitte nutzen Sie den Mitarbeiter-Login."
              );
              setLoading(false);
              return;
            }

            setEmployee({
              id: emp.id,
              companyId: company.id,
              ...employeeData,
            });

            setLoading(false);
            return;
          }
        }

        setMessage("Ungültiger oder abgelaufener Einladungslink.");
      } catch (error: any) {
        console.error(error);
        setMessage(`Fehler beim Laden der Einladung: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadEmployee();
  }, [token]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (!employee?.email) {
      setMessage("Für diesen Mitarbeiter ist keine E-Mail-Adresse hinterlegt.");
      return;
    }

    setSaving(true);

    try {
      const cleanEmail = employee.email.trim().toLowerCase();
      const now = new Date().toISOString();

      const userCred = await createUserWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      await updateDoc(
        doc(db, "companies", employee.companyId, "employees", employee.id),
        {
          portalAccess: true,
          portalStatus: "active",

          inviteStatus: "active",
          invitationAccepted: true,
          invitationAcceptedAt: now,

          userId: userCred.user.uid,
          authUid: userCred.user.uid,
          registeredAt: now,
          updatedAt: now,
        }
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: cleanEmail,
        role: "employee",
        companyId: employee.companyId,
        employeeId: employee.id,
        accessScope: "self",

        invited: true,
        invitationAccepted: true,
        invitationAcceptedAt: now,
        lastLoginAt: now,
        createdAt: now,
        updatedAt: now,
      });

      document.cookie = `uid=${userCred.user.uid}; path=/; max-age=604800; SameSite=Lax`;

      window.location.href = `/employee/self-service/${employee.companyId}/${employee.id}`;
    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        setMessage(
          "Für diese E-Mail-Adresse existiert bereits ein Zugang. Bitte nutzen Sie den Mitarbeiter-Login."
        );
      } else {
        setMessage(error.message || "Registrierung fehlgeschlagen.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p>Lade Registrierung...</p>
      </main>
    );
  }

  if (!employee) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <h1 className="text-2xl font-bold">Einladung nicht verfügbar</h1>
          <p className="mt-3 text-sm text-gray-600">
            {message || "Der Einladungslink ist ungültig oder abgelaufen."}
          </p>
          <a
            href="/employee/login"
            className="mt-5 inline-block rounded-xl bg-blue-900 px-5 py-3 text-sm font-medium text-white"
          >
            Zum Mitarbeiter-Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold">Mitarbeiter Registrierung</h1>
          <p className="mt-1 text-sm text-gray-600">
            Bitte legen Sie Ihr Passwort für den Employee Self Service fest.
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="font-medium">
            {employee.firstName} {employee.lastName}
          </p>
          <p className="text-sm text-gray-600">{employee.email}</p>
        </div>

        <input
          type="password"
          placeholder="Passwort festlegen"
          className="w-full rounded border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-blue-900 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving ? "Registriert..." : "Registrieren"}
        </button>

        {message && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}

export default function EmployeeRegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <p>Lade Registrierung...</p>
        </main>
      }
    >
      <EmployeeRegisterContent />
    </Suspense>
  );
}