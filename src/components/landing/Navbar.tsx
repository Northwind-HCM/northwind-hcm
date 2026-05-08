"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all ${
        scrolled
          ? "border-b bg-white/90 shadow-sm backdrop-blur"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/northwind-logo.png"
            alt="Northwind Payroll & Consulting"
            width={52}
            height={52}
            className="h-12 w-auto"
            priority
          />

          <div>
            <p className="text-xl font-bold text-blue-900">
              Northwind
            </p>

            <p className="text-xs text-gray-500">
              Payroll-ready HR Software
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            className="text-sm text-gray-600 transition hover:text-blue-900"
          >
            Funktionen
          </a>

          <a
            href="#pricing"
            className="text-sm text-gray-600 transition hover:text-blue-900"
          >
            Preise
          </a>

          <a
            href="#security"
            className="text-sm text-gray-600 transition hover:text-blue-900"
          >
            Sicherheit
          </a>

          <Link
            href="/client/login"
            className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
          >
            Login
          </Link>

          <Link
            href="/client/register"
            className="rounded-xl bg-blue-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            Early Access
          </Link>
        </nav>

      </div>
    </header>
  );
}