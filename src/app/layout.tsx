import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northwind HCM | Payroll-ready HR Software",
  description:
    "Payroll & HCM für Deutschland. Mitarbeiterverwaltung, Employee Self-Service, Fehlzeiten, Dokumente und Payroll Readiness in einer Plattform.",

  keywords: [
    "Payroll Deutschland",
    "HCM Software",
    "HR Software Deutschland",
    "Employee Self Service",
    "Lohnabrechnung",
    "Payroll Ready",
    "Digitale Personalakte",
    "Fehlzeiten",
    "HR Plattform",
  ],

  authors: [
    {
      name: "Northwind Payroll & HR Consulting GmbH",
    },
  ],

  creator: "Northwind Payroll & HR Consulting GmbH",

  openGraph: {
    title: "Northwind HCM",
    description:
      "Payroll-ready HR Software für Deutschland.",
    url: "https://northwind-hr.eu",
    siteName: "Northwind HCM",
    locale: "de_DE",
    type: "website",
  },

  robots: {
    index: true,
    follow: true,
  },

  metadataBase: new URL("https://northwind-hr.eu"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}