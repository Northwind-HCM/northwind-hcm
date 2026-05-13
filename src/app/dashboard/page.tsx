// src/app/dashboard/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "northwind_admin") {
    return (
      <main className="space-y-6">
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

  if (!user.companyId) {
    return (
      <main className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-red-600">
          Ihrem Benutzer ist noch kein Mandant zugeordnet.
        </p>
      </main>
    );
  }

  redirect(`/dashboard/${user.companyId}`);
}