import { NextResponse } from "next/server";
import { Resend } from "resend";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export async function POST(request: Request) {
  try {
    console.log("API HIT: invite-employee");

    console.log("RESEND_API_KEY vorhanden:", !!process.env.RESEND_API_KEY);
    console.log("RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL);
    console.log("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);

    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();
    console.log("Request Body:", body);

    const { companyId, employeeId, email, firstName } = body;

    if (!companyId || !employeeId || !email) {
      return NextResponse.json(
        { error: "companyId, employeeId und email sind erforderlich." },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();

    await updateDoc(doc(db, "companies", companyId, "employees", employeeId), {
      inviteStatus: "invited",
      inviteToken: token,
      invitedAt: new Date().toISOString(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteLink = `${appUrl}/employee/register?token=${token}`;

    const from =
      process.env.RESEND_FROM_EMAIL ||
      "Northwind Payroll <onboarding@resend.dev>";

    console.log("Sende Einladung an:", email);
    console.log("Von:", from);
    console.log("Invite Link:", inviteLink);

    const result = await resend.emails.send({
      from,
      to: email,
      subject: "Einladung zum Northwind Payroll Portal",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Einladung zum Northwind Payroll Portal</h2>
          <p>Hallo ${firstName || ""},</p>
          <p>Ihr Arbeitgeber hat Sie eingeladen, Ihre Daten für die Lohnabrechnung im Northwind Payroll Portal zu prüfen und zu ergänzen.</p>
          <p>
            <a href="${inviteLink}" style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;">
              Zugang einrichten
            </a>
          </p>
          <p>Falls der Button nicht funktioniert, kopieren Sie diesen Link in den Browser:</p>
          <p>${inviteLink}</p>
          <p>Viele Grüße<br/>Northwind Payroll</p>
        </div>
      `,
    });

    console.log("Resend Ergebnis:", result);

    return NextResponse.json({
      success: true,
      inviteLink,
      result,
    });
  } catch (error: any) {
    console.error("Invite error:", error);

    return NextResponse.json(
      { error: error.message || "Einladung konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}