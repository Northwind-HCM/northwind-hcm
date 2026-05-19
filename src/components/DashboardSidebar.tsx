"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTranslations, type Locale } from "@/lib/i18n/translations";

type Props = {
  companyId: string;
  locale?: Locale;
};

const navItems = [
  { key: "dashboard", href: "" },
  { key: "monthly", href: "/monthly" },
  { key: "tasks", href: "/tasks" },
  { key: "companyData", href: "/company-data" },
  { key: "employees", href: "/employees" },
  { key: "payroll", href: "/payroll" },
  { key: "absences", href: "/absences" },
  { key: "settings", href: "/settings" },
] as const;

export default function DashboardSidebar({
  companyId,
  locale = "de",
}: Props) {
  const pathname = usePathname();
  const t = getTranslations(locale);

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <h2 className="text-xl font-bold text-gray-900">Northwind</h2>
        <p className="text-sm text-gray-500">Payroll & HCM Platform</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const href = `/dashboard/${companyId}${item.href}`;
          const isActive =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={item.key}
              href={href}
              className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {t.navigation[item.key]}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700">Northwind HCM</p>
        <p className="mt-1">
          {locale === "en"
            ? "Manage payroll, HR and employee operations in one workspace."
            : "Payroll-, HR- und Mitarbeiterverwaltung zentral steuern."}
        </p>
      </div>
    </aside>
  );
}