"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { getTranslations, type Locale } from "@/lib/i18n/translations";

type Props = {
  companyId: string;
};

export default function DashboardTopbar({ companyId }: Props) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [locale, setLocale] = useState<Locale>("de");

  const t = getTranslations(locale);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEmail(user.email || "");

        const snap = await getDoc(doc(db, "companies", companyId));

        if (snap.exists()) {
          const data = snap.data();

          setCompanyName(data.companyName || "");

          if (data.defaultLocale === "en") {
            setLocale("en");
          } else {
            setLocale("de");
          }
        }
      }
    });

    return () => unsubscribe();
  }, [companyId]);

  async function handleLogout() {
    await signOut(auth);
    window.location.href = "/client/login";
  }

  return (
    <header className="flex items-center justify-between border-b bg-white px-6 py-4">
      <div>
        <p className="text-sm text-gray-500">
          {locale === "en" ? "Client" : "Mandant"}
        </p>

        <p className="font-medium text-gray-900">{companyName}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{email}</p>

          <p className="text-xs text-gray-500">
            {locale === "en" ? "Administrator" : "Administrator"}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
        >
          {locale === "en" ? "Logout" : "Abmelden"}
        </button>
      </div>
    </header>
  );
}