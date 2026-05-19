import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const from =
      process.env.RESEND_FROM_EMAIL ||
      "Northwind Payroll <onboarding@resend.dev>";

    if (!resendApiKey) {
      return NextResponse.json(
        {
          error: "RESEND_API_KEY fehlt in den Environment Variables.",
        },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    const body = await request.json();

    const {
      companyId,
      employeeId,
      email,
      firstName,
      invitedBy,
    } = body;

    if (!companyId || !employeeId || !email) {
      return NextResponse.json(
        {
          error:
            "companyId, employeeId und email sind erforderlich.",
        },
        { status: 400 }
      );
    }

    const employeeRef = doc(
      db,
      "companies",
      companyId,
      "employees",
      employeeId
    );

    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      return NextResponse.json(
        { error: "Mitarbeiter wurde nicht gefunden." },
        { status: 404 }
      );
    }

    const employee = employeeSnap.data();

    if (employee.status === "archived") {
      return NextResponse.json(
        {
          error:
            "Archivierte Mitarbeiter können nicht eingeladen werden.",
        },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();

    const now = new Date().toISOString();

    await updateDoc(employeeRef, {
      portalAccess: true,
      portalStatus: "invited",

      inviteStatus: "invited",
      inviteToken: token,
      invitedAt: now,
      inviteEmail: email,
      inviteLastSentAt: now,
      invitationAccepted: false,

      updatedAt: now,
    });

    /*
      =========================================================
      PREPARE PENDING PORTAL USER
      =========================================================
    */

    const pendingUserRef = doc(
      db,
      "pendingPortalUsers",
      token
    );

    await setDoc(
      pendingUserRef,
      {
        token,

        companyId,
        employeeId,

        email: email.toLowerCase(),

        firstName:
          firstName ||
          employee.firstName ||
          "",

        lastName:
          employee.lastName || "",

        role: "employee",

        status: "pending_registration",

        invitedBy: invitedBy || "",
        invitedAt: serverTimestamp(),

        invitationAccepted: false,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    /*
      =========================================================
      INVITE LINK
      =========================================================
    */

    const inviteLink = `${appUrl}/employee/register?token=${token}`;

    const displayName =
      firstName ||
      employee.firstName ||
      employee.lastName ||
      "Hallo";

    /*
      =========================================================
      SEND EMAIL
      =========================================================
    */

    const result = await resend.emails.send({
      from,
      to: email,

      subject:
        "Einladung zum Northwind Payroll Portal",

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">

          <h2 style="color:#1e3a8a;">
            Einladung zum Northwind Payroll Portal
          </h2>

          <p>
            Hallo ${displayName},
          </p>

          <p>
            Ihr Arbeitgeber hat Sie eingeladen,
            Ihre Daten für die Lohnabrechnung
            im Northwind Payroll Portal
            zu prüfen und zu ergänzen.
          </p>

          <p>
            Über das Portal können Sie:
          </p>

          <ul>
            <li>Dokumente hochladen</li>
            <li>Krankmeldungen einreichen</li>
            <li>Arbeitszeiten erfassen</li>
            <li>Payroll-Dokumente abrufen</li>
            <li>Abwesenheiten beantragen</li>
          </ul>

          <p>
            Bitte richten Sie Ihren Zugang
            über den folgenden Button ein:
          </p>

          <p>
            <a
              href="${inviteLink}"
              style="
                display:inline-block;
                background:#1e3a8a;
                color:#ffffff;
                padding:12px 18px;
                border-radius:8px;
                text-decoration:none;
              "
            >
              Zugang einrichten
            </a>
          </p>

          <p style="font-size:13px;color:#4b5563;">
            Falls der Button nicht funktioniert,
            kopieren Sie diesen Link in Ihren Browser:
          </p>

          <p style="font-size:13px;word-break:break-all;color:#1e3a8a;">
            ${inviteLink}
          </p>

          <p>
            Viele Grüße<br/>
            Northwind Payroll
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,

      inviteLink,

      portalStatus: "invited",
      inviteStatus: "invited",

      token,

      result,
    });
  } catch (error: any) {
    console.error("Invite error:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Einladung konnte nicht gesendet werden.",
      },
      { status: 500 }
    );
  }
}