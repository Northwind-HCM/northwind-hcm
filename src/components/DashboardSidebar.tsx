"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  companyId: string;
};

const navItems = [
  { label: "Dashboard", href: "" },
  { label: "Monatsübersicht", href: "/monthly" },
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
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r bg-white px-4 py-6">
      {/* Logo */}
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-gray-900">Northwind</h2>

        <p className="text-sm text-gray-500">Payroll & HCM Platform</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const href = `/dashboard/${companyId}${item.href}`;
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.label}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Northwind HCM</p>

        <p className="mt-1">
          Payroll-, HR- und Mitarbeiterverwaltung zentral steuern.
        </p>
      </div>
    </aside>
  );
}