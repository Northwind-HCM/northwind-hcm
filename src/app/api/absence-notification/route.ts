import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();

    const {
      to,
      subject,
      message,
    }: {
      to: string;
      subject: string;
      message: string;
    } = body;

    if (!to || !subject || !message) {
      return NextResponse.json(
        { error: "to, subject und message sind erforderlich." },
        { status: 400 }
      );
    }

    const from =
      process.env.RESEND_FROM_EMAIL ||
      "Northwind Payroll <onboarding@resend.dev>";

    const result = await resend.emails.send({
      from,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Northwind Payroll Portal</h2>
          <p>${message}</p>
          <p>Viele Grüße<br/>Northwind Payroll</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Absence notification error:", error);

    return NextResponse.json(
      { error: error.message || "Benachrichtigung konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
}