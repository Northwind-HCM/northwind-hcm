"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  companyId: string;
};

const navItems = [
  { label: "Dashboard", href: "" },
{ label: "Aufgaben", href: "/tasks" },
  { label: "Firmenstammdaten", href: "/company-data" },
  { label: "Mitarbeiter", href: "/employees" },
  { label: "Payroll", href: "/payroll" },
  { label: "Fehlzeiten", href: "/absences" },
  { label: "Einstellungen", href: "/settings" },

];

export default function DashboardSidebar({ companyId }: Props) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-white px-4 py-6">
      
      {/* Logo */}
      <div className="mb-8 px-2">
        <h2 className="text-lg font-semibold text-gray-900">Northwind</h2>
        <p className="text-sm text-gray-500">Payroll Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const href = `/dashboard/${companyId}${item.href}`;
          const isActive = pathname === href;

          return (
            <Link
              key={item.label}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition
                ${
                  isActive
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <p className="font-medium text-gray-700">Onboarding aktiv</p>
        <p className="mt-1">Mandant wird eingerichtet</p>
      </div>
    </aside>
  );
}