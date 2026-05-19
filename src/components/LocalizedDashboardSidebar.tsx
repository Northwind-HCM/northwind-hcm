"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import DashboardSidebar from "@/components/DashboardSidebar";
import { db } from "@/lib/firebase";
import type { Locale } from "@/lib/i18n/translations";

type Props = {
  companyId: string;
};

export default function LocalizedDashboardSidebar({
  companyId,
}: Props) {
  const [locale, setLocale] = useState<Locale>("de");

  useEffect(() => {
    async function loadLocale() {
      try {
        const companySnap = await getDoc(
          doc(db, "companies", companyId)
        );

        if (!companySnap.exists()) return;

        const data = companySnap.data();

        if (data.defaultLocale === "en") {
          setLocale("en");
        } else {
          setLocale("de");
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadLocale();
  }, [companyId]);

  return (
    <DashboardSidebar
      companyId={companyId}
      locale={locale}
    />
  );
}