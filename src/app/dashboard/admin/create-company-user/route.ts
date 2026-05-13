import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin ENV fehlt: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL oder FIREBASE_PRIVATE_KEY."
    );
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export async function POST(request: Request) {
  try {
    const { auth, db } = getFirebaseAdminApp();

    const body = await request.json();

    const { companyId, email, displayName, role, employeeId } = body;

    if (!companyId || !email || !role) {
      return NextResponse.json(
        { error: "companyId, email und role sind erforderlich." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    let userRecord;

    try {
      userRecord = await auth.getUserByEmail(cleanEmail);
    } catch {
      userRecord = await auth.createUser({
        email: cleanEmail,
        displayName: displayName || cleanEmail,
        emailVerified: false,
      });
    }

    const resetLink = await auth.generatePasswordResetLink(cleanEmail);

    const now = new Date().toISOString();

    await db.collection("users").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: cleanEmail,
        displayName: displayName || "",
        role,
        companyId,
        employeeId: employeeId || "",
        accessScope: role === "employee" ? "self" : "company",
        invited: true,
        invitationAccepted: false,
        invitedAt: now,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Northwind HR <onboarding@resend.dev>",
      to: cleanEmail,
      subject: "Einladung zum Northwind Portal",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Willkommen bei Northwind</h2>
          <p>Hallo ${displayName || ""},</p>
          <p>Sie wurden für das Northwind HR & Payroll Portal eingeladen.</p>
          <p>Bitte vergeben Sie jetzt Ihr Passwort:</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;background:#0f172a;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">
              Passwort festlegen
            </a>
          </p>
          <p>Viele Grüße<br/>Northwind HR</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error("Create company user error:", error);

    return NextResponse.json(
      { error: error.message || "Benutzer konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}