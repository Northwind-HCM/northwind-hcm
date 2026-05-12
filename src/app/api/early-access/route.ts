import { NextResponse } from "next/server";
import { Resend } from "resend";

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
      employees,
      interest,
      message,
    } = body;

    if (!companyName || !contactName || !email) {
      return NextResponse.json(
        { error: "Firmenname, Ansprechpartner und E-Mail sind erforderlich." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "Northwind Payroll <onboarding@resend.dev>",
      to: "roland.schrader@northwind-hr.de",
      subject: `Early Access Anfrage: ${companyName}`,
      html: `
        <h2>Neue Early Access Anfrage</h2>
        <p><strong>Firma:</strong> ${companyName}</p>
        <p><strong>Ansprechpartner:</strong> ${contactName}</p>
        <p><strong>E-Mail:</strong> ${email}</p>
        <p><strong>Mitarbeiter:</strong> ${employees || "-"}</p>
        <p><strong>Interesse:</strong> ${interest || "-"}</p>
        <p><strong>Nachricht:</strong></p>
        <p>${message || "-"}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Early access error:", error);

    return NextResponse.json(
      { error: error.message || "Anfrage konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}