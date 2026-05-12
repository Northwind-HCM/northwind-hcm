import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12 md:flex-row md:justify-between">

        {/* Logo / Brand */}
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <Image
              src="/northwind-logo.png"
              alt="Northwind Payroll & Consulting"
              width={52}
              height={52}
              className="h-12 w-auto"
            />

            <div>
              <p className="text-xl font-bold text-blue-900">
                Northwind
              </p>

              <p className="text-xs text-gray-500">
                Payroll-ready HR Software
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            Moderne Payroll- und HR-Plattform für Deutschland.
            Mitarbeiterverwaltung, Employee Self Service,
            digitale Prozesse und Payroll Readiness in einer Lösung.
          </p>
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-10 text-sm md:grid-cols-3">

          <div>
            <p className="mb-3 font-semibold text-gray-900">
              Produkt
            </p>

            <div className="space-y-2">
              <a href="#features" className="block text-gray-600 hover:text-blue-900">
                Funktionen
              </a>

              <a href="#pricing" className="block text-gray-600 hover:text-blue-900">
                Preise
              </a>

              <a href="#security" className="block text-gray-600 hover:text-blue-900">
                Sicherheit
              </a>
            </div>
          </div>

          <div>
            <p className="mb-3 font-semibold text-gray-900">
              Zugang
            </p>

            <div className="space-y-2">
              <Link
                href="/login"
                className="block text-gray-600 hover:text-blue-900"
              >
                Login
              </Link>

              <Link
                href="/early-access"
                className="block text-gray-600 hover:text-blue-900"
              >
                Early Access
              </Link>
            </div>
          </div>

          <div>
            <p className="mb-3 font-semibold text-gray-900">
              Rechtliches
            </p>

            <div className="space-y-2">
              <Link
                href="/impressum"
                className="block text-gray-600 hover:text-blue-900"
              >
                Impressum
              </Link>

              <Link
                href="/datenschutz"
                className="block text-gray-600 hover:text-blue-900"
              >
                Datenschutz
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom */}
      <div className="border-t bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-4 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 Northwind Payroll & HR Consulting GmbH
          </p>

          <p>
            Made in Germany · DSGVO-ready · Payroll-ready
          </p>
        </div>
      </div>
    </footer>
  );
}