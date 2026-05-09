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

  useEffect(() => {
    async function loadEmployee() {
      if (!token) {
        setMessage("Kein Einladungs-Token gefunden.");
        return;
      }

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

          setEmployee({
            id: emp.id,
            companyId: company.id,
            ...emp.data(),
          });

          return;
        }
      }

      setMessage("Ungültiger Einladungslink.");
    }

    loadEmployee();
  }, [token]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        employee.email,
        password
      );

      await updateDoc(
        doc(db, "companies", employee.companyId, "employees", employee.id),
        {
          status: "active",
          inviteStatus: "active",
          userId: userCred.user.uid,
          authUid: userCred.user.uid,
          registeredAt: new Date().toISOString(),
        }
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: employee.email,
        role: "employee",
        companyId: employee.companyId,
        employeeId: employee.id,
        accessScope: "self",
        createdAt: new Date().toISOString(),
      });

      document.cookie = `uid=${userCred.user.uid}; path=/; max-age=86400; SameSite=Lax`;

      window.location.href = `/employee/self-service/${employee.companyId}/${employee.id}`;
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  if (!employee) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p>{message || "Lade..."}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-2xl font-bold">Mitarbeiter Registrierung</h1>

        <div>
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

        <button className="w-full rounded-xl bg-blue-900 py-3 text-white">
          Registrieren
        </button>

        {message && <p className="text-sm text-red-600">{message}</p>}
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