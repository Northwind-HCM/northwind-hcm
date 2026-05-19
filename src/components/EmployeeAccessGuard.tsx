"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCurrentAppUser } from "@/lib/currentUser";
import { canViewEmployee, type AppUser } from "@/lib/rbac";

type Props = {
  companyId: string;
  employeeId: string;
  children: ReactNode;
};

export default function EmployeeAccessGuard({
  companyId,
  employeeId,
  children,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          window.location.href = "/employee/login";
          return;
        }

        const user = await getCurrentAppUser();

        setAppUser(user);
        setAllowed(canViewEmployee(user, companyId, employeeId));
      } catch (error) {
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [companyId, employeeId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="rounded-2xl bg-white p-6 shadow">
          Zugriff wird geprüft...
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-medium text-red-700">
            Zugriff verweigert
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Kein Zugriff auf diesen Self-Service-Bereich
          </h1>

          <p className="mt-2 text-gray-600">
            Dieser Bereich ist nur für den zugeordneten Mitarbeiter oder
            berechtigte HR-/Northwind-Benutzer sichtbar.
          </p>

          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <p>
              Rolle:{" "}
              <span className="font-semibold">
                {appUser?.role || "unbekannt"}
              </span>
            </p>

            <p>
              Mandant: <span className="font-semibold">{companyId}</span>
            </p>

            <p>
              Mitarbeiter:{" "}
              <span className="font-semibold">{employeeId}</span>
            </p>
          </div>

          <Link
            href="/employee/login"
            className="mt-6 inline-block rounded-xl bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800"
          >
            Zum Login
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}