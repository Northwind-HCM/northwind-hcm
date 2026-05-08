// src/app/dashboard/page.tsx

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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
            Bitte wählen Sie einen Mandanten aus.
          </p>
        </div>
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