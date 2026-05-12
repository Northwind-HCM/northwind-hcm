import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://northwind-hr.eu"),

  title: {
    default: "Northwind HR",
    template: "%s | Northwind HR",
  },

  description:
    "Payroll-ready HR Software für moderne Unternehmen. Digitale Personalakte, Employee Self-Service und deutsche Payroll-Prozesse.",

  keywords: [
    "Payroll Software Deutschland",
    "HR Software",
    "Lohnabrechnung",
    "Employee Self Service",
    "Digitale Personalakte",
    "HCM Software",
  ],

  openGraph: {
    title: "Northwind HR",
    description: "Payroll-ready HR Software für moderne Unternehmen.",
    url: "https://northwind-hr.eu",
    siteName: "Northwind HR",
    locale: "de_DE",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}