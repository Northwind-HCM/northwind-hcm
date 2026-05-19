"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCurrentAppUser } from "@/lib/currentUser";
import { canAccessCompany, type AppUser } from "@/lib/rbac";

type Props = {
  companyId: string;
  children: ReactNode;
};

export default function CompanyAccessGuard({ companyId, children }: Props) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          window.location.href = "/login";
          return;
        }

        const user = await getCurrentAppUser();

        setAppUser(user);
        setAllowed(canAccessCompany(user, companyId));
      } catch (error) {
        console.error(error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [companyId]);

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
            Keine Berechtigung für diesen Mandanten
          </h1>

          <p className="mt-2 text-gray-600">
            Dein Benutzer ist nicht für diese Firma freigeschaltet.
          </p>

          <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
            <p>
              Rolle:{" "}
              <span className="font-semibold">
                {appUser?.role || "unbekannt"}
              </span>
            </p>

            <p>
              Mandant:{" "}
              <span className="font-semibold">
                {companyId}
              </span>
            </p>
          </div>

          <Link
            href="/login"
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