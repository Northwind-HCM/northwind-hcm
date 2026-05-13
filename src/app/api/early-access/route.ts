import { NextResponse } from "next/server";
import { Resend } from "resend";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export async function POST(request: Request) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);
    const body = await request.json();

    const {
      companyName,
      contactName,
      email,
      phone,
      employees,
      currentPayroll,
      interest,
      desiredStart,
      message,
      privacyAccepted,
    } = body;

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        { error: "Firmenname, Ansprechpartner und E-Mail sind erforderlich." },
        { status: 400 }
      );
    }

    if (!privacyAccepted) {
      return NextResponse.json(
        { error: "Der Datenschutzhinweis muss bestätigt werden." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const leadRef = await addDoc(collection(db, "earlyAccessLeads"), {
      companyName,
      contactName,
      email,
      phone: phone || "",
      employees: employees || "",
      currentPayroll: currentPayroll || "",
      interest: interest || "",
      desiredStart: desiredStart || "",
      message: message || "",

      status: "new",
      source: "website",
      privacyAccepted: true,
      privacyAcceptedAt: now,

      createdAt: serverTimestamp(),
      createdAtIso: now,
      updatedAt: now,
    });

    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Northwind Payroll <onboarding@resend.dev>",
      to: "roland.schrader@northwind-hr.de",
      subject: `Early Access Anfrage: ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
          <h2 style="color:#1e3a8a;">Neue Early Access Anfrage</h2>

          <p><strong>Lead-ID:</strong> ${leadRef.id}</p>
          <p><strong>Firma:</strong> ${companyName}</p>
          <p><strong>Ansprechpartner:</strong> ${contactName}</p>
          <p><strong>E-Mail:</strong> ${email}</p>
          <p><strong>Telefon:</strong> ${phone || "-"}</p>
          <p><strong>Mitarbeiter:</strong> ${employees || "-"}</p>
          <p><strong>Aktuelle Payroll-Situation:</strong> ${currentPayroll || "-"}</p>
          <p><strong>Interesse:</strong> ${interest || "-"}</p>
          <p><strong>Gewünschter Start:</strong> ${desiredStart || "-"}</p>

          <p><strong>Nachricht:</strong></p>
          <p>${message || "-"}</p>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

          <p style="font-size: 12px; color: #6b7280;">
            Datenschutzhinweis bestätigt: Ja<br/>
            Quelle: Website Early Access Formular
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      leadId: leadRef.id,
    });
  } catch (error: any) {
    console.error("Early access error:", error);

    return NextResponse.json(
      { error: error.message || "Anfrage konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}