"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type AppUser = {
  uid: string;
  email?: string;
  role?: string;
  companyId?: string;
  employeeId?: string;
  accessScope?: string;
};

export default function DashboardPage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          window.location.href = "/login";
          return;
        }

        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (!userSnap.exists()) {
          setMessage("Kein Benutzerprofil gefunden.");
          setLoading(false);
          return;
        }

        const data = userSnap.data();

        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: data.email,
          role: data.role,
          companyId: data.companyId,
          employeeId: data.employeeId,
          accessScope: data.accessScope,
        };

        if (appUser.role !== "northwind_admin" && appUser.companyId) {
          window.location.href = `/dashboard/${appUser.companyId}`;
          return;
        }

        setUser(appUser);
        setLoading(false);
      } catch (error: any) {
        console.error(error);
        setMessage(error.message || "Dashboard konnte nicht geladen werden.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <p>Lade Dashboard...</p>
      </main>
    );
  }

  if (message) {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{message}</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "northwind_admin") {
    return (
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-red-600">
          Ihrem Benutzer ist noch kein Mandant zugeordnet.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Northwind Dashboard</h1>
        <p className="text-gray-600">
          Interne Übersicht für Mandanten, Leads und Administration.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/leads"
          className="rounded-2xl bg-white p-6 shadow transition hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Early Access</p>
          <h2 className="mt-2 text-xl font-bold text-blue-900">
            Leads verwalten
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Neue Anfragen prüfen, Status setzen und Pilotkunden vorbereiten.
          </p>
        </Link>

        <Link
          href="/dashboard/admin/companies"
          className="rounded-2xl bg-white p-6 shadow transition hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Mandanten</p>
          <h2 className="mt-2 text-xl font-bold text-blue-900">
            Mandanten verwalten
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Firmenübersicht, Stammdaten und Portalzugänge.
          </p>
        </Link>

<Link
  href="/dashboard/admin/users"
  className="rounded-2xl bg-white p-6 shadow transition hover:shadow-md"
>
  <p className="text-sm text-gray-500">Administration</p>
  <h2 className="mt-2 text-xl font-bold text-blue-900">
    Benutzer verwalten
  </h2>
  <p className="mt-2 text-sm text-gray-600">
    Rollen, Mandanten und Zugriffe zentral steuern.
  </p>
</Link>

        <Link
          href="/"
          className="rounded-2xl bg-white p-6 shadow transition hover:shadow-md"
        >
          <p className="text-sm text-gray-500">Website</p>
          <h2 className="mt-2 text-xl font-bold text-blue-900">
            Zur Landingpage
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Öffentliche Northwind HCM Website prüfen.
          </p>
        </Link>
      </section>
    </main>
  );
}