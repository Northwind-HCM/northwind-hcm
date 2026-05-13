import { NextResponse } from "next/server";
import { Resend } from "resend";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyId,
      email,
      displayName,
      role,
    } = body;

    if (!companyId || !email || !role) {
      return NextResponse.json(
        {
          error: "companyId, email und role sind erforderlich.",
        },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    let userRecord;

    try {
      userRecord = await adminAuth.getUserByEmail(cleanEmail);
    } catch {
      userRecord = await adminAuth.createUser({
        email: cleanEmail,
        displayName,
        emailVerified: true,
      });
    }

    const resetLink = await adminAuth.generatePasswordResetLink(cleanEmail);

    await adminDb.collection("users").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: cleanEmail,
        displayName: displayName || "",
        role,
        companyId,
        accessScope: role === "employee" ? "self" : "company",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const resend = new Resend(process.env.RESEND_API_KEY);

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

          <p>
            Sie wurden für das Northwind HR & Payroll Portal eingeladen.
          </p>

          <p>
            Bitte vergeben Sie jetzt Ihr Passwort:
          </p>

          <p>
            <a
              href="${resetLink}"
              style="
                display:inline-block;
                background:#0f172a;
                color:white;
                padding:12px 18px;
                border-radius:10px;
                text-decoration:none;
                font-weight:600;
              "
            >
              Passwort festlegen
            </a>
          </p>

          <p>
            Danach können Sie sich direkt anmelden.
          </p>

          <p>
            Viele Grüße<br/>
            Northwind HR
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      uid: userRecord.uid,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Benutzer konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}