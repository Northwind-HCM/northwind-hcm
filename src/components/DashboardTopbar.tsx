"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

type Props = {
  companyId: string;
};

export default function DashboardTopbar({ companyId }: Props) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEmail(user.email || "");

        const snap = await getDoc(doc(db, "companies", companyId));
        if (snap.exists()) {
          setCompanyName(snap.data().companyName || "");
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
      {/* Left */}
      <div>
        <p className="text-sm text-gray-500">Mandant</p>
        <p className="font-medium text-gray-900">{companyName}</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{email}</p>
          <p className="text-xs text-gray-500">Administrator</p>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}