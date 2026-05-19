"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";

type PendingPortalUser = {
  token: string;
  companyId: string;
  employeeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "employee";
  status?: string;
  invitationAccepted?: boolean;
};

function EmployeeRegisterContent() {
  const params = useSearchParams();

  const token = params.get("token");

  const [password, setPassword] = useState("");

  const [pendingUser, setPendingUser] =
    useState<PendingPortalUser | null>(null);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /*
    =========================================================
    LOAD INVITATION
    =========================================================
  */

  useEffect(() => {
    async function loadInvitation() {
      setLoading(true);

      try {
        if (!token) {
          setMessage("Kein Einladungs-Token gefunden.");
          setLoading(false);
          return;
        }

        const pendingUserRef = doc(
          db,
          "pendingPortalUsers",
          token
        );

        const pendingUserSnap = await getDoc(
          pendingUserRef
        );

        if (!pendingUserSnap.exists()) {
          setMessage(
            "Ungültiger oder abgelaufener Einladungslink."
          );

          setLoading(false);
          return;
        }

        const pendingData =
          pendingUserSnap.data() as PendingPortalUser;

        /*
          =====================================================
          ALREADY ACCEPTED?
          =====================================================
        */

        if (
          pendingData.invitationAccepted === true ||
          pendingData.status === "active"
        ) {
          setMessage(
            "Diese Einladung wurde bereits angenommen. Bitte nutzen Sie den Mitarbeiter-Login."
          );

          setLoading(false);
          return;
        }

        /*
          =====================================================
          VALIDATE EMPLOYEE
          =====================================================
        */

        const employeeRef = doc(
          db,
          "companies",
          pendingData.companyId,
          "employees",
          pendingData.employeeId
        );

        const employeeSnap = await getDoc(employeeRef);

        if (!employeeSnap.exists()) {
          setMessage(
            "Der zugehörige Mitarbeiter wurde nicht gefunden."
          );

          setLoading(false);
          return;
        }

        setPendingUser(pendingData);
      } catch (error: any) {
        console.error(error);

        setMessage(
          error.message ||
            "Einladung konnte nicht geladen werden."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [token]);

  /*
    =========================================================
    REGISTER
    =========================================================
  */

  async function handleRegister(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!pendingUser) return;

    if (password.length < 6) {
      setMessage(
        "Das Passwort muss mindestens 6 Zeichen lang sein."
      );

      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const cleanEmail =
        pendingUser.email.trim().toLowerCase();

      /*
        =====================================================
        CREATE FIREBASE AUTH USER
        =====================================================
      */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const uid = userCredential.user.uid;

      /*
        =====================================================
        CREATE APP USER
        =====================================================
      */

      await setDoc(
        doc(db, "users", uid),
        {
          uid,

          email: cleanEmail,

          role: "employee",

          companyId: pendingUser.companyId,

          companyIds: [pendingUser.companyId],

          employeeId: pendingUser.employeeId,

          accessScope: "self",

          invited: true,

          invitationAccepted: true,

          invitationAcceptedAt: serverTimestamp(),

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      /*
        =====================================================
        UPDATE EMPLOYEE
        =====================================================
      */

      await updateDoc(
        doc(
          db,
          "companies",
          pendingUser.companyId,
          "employees",
          pendingUser.employeeId
        ),
        {
          portalAccess: true,

          portalStatus: "active",

          inviteStatus: "active",

          invitationAccepted: true,

          authUid: uid,
          userId: uid,

          registeredAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      /*
        =====================================================
        UPDATE PENDING INVITE
        =====================================================
      */

      await updateDoc(
        doc(db, "pendingPortalUsers", token!),
        {
          status: "active",

          invitationAccepted: true,

          authUid: uid,

          activatedAt: serverTimestamp(),

          updatedAt: serverTimestamp(),
        }
      );

      /*
        =====================================================
        OPTIONAL CLEANUP
        =====================================================
      */

      // Optional:
      // await deleteDoc(
      //   doc(db, "pendingPortalUsers", token!)
      // );

      /*
        =====================================================
        SIGN OUT + REDIRECT
        =====================================================
      */

      await signOut(auth);

      window.location.href =
        `/employee/login?registered=1`;
    } catch (error: any) {
      console.error(error);

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setMessage(
          "Für diese E-Mail-Adresse existiert bereits ein Benutzerkonto."
        );
      } else {
        setMessage(
          error.message ||
            "Registrierung fehlgeschlagen."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  /*
    =========================================================
    LOADING
    =========================================================
  */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p>Lade Registrierung...</p>
      </main>
    );
  }

  /*
    =========================================================
    INVALID
    =========================================================
  */

  if (!pendingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <h1 className="text-2xl font-bold">
            Einladung nicht verfügbar
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            {message ||
              "Der Einladungslink ist ungültig oder abgelaufen."}
          </p>

          <a
            href="/employee/login"
            className="mt-5 inline-block rounded-xl bg-blue-900 px-5 py-3 text-sm font-medium text-white"
          >
            Zum Mitarbeiter-Login
          </a>
        </div>
      </main>
    );
  }

  /*
    =========================================================
    REGISTER FORM
    =========================================================
  */

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <div>
          <h1 className="text-2xl font-bold">
            Mitarbeiter Registrierung
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Bitte legen Sie Ihr Passwort
            für den Employee Self Service fest.
          </p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="font-medium">
            {pendingUser.firstName}{" "}
            {pendingUser.lastName}
          </p>

          <p className="text-sm text-gray-600">
            {pendingUser.email}
          </p>
        </div>

        <input
          type="password"
          placeholder="Passwort festlegen"
          className="w-full rounded-xl border p-3"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          minLength={6}
          required
        />

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-blue-900 py-3 font-medium text-white disabled:opacity-50"
        >
          {saving
            ? "Registriert..."
            : "Registrieren"}
        </button>

        {message && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}

export default function EmployeeRegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <p>Lade Registrierung...</p>
        </main>
      }
    >
      <EmployeeRegisterContent />
    </Suspense>
  );
}