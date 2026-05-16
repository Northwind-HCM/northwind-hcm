import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

function getAdminDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin ENV Variablen fehlen.");
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

  return getFirestore();
}

const employees = [
  ["Max", "Mustermann", "IT", "Softwareentwickler"],
  ["Anna", "Schmidt", "HR", "HR Manager"],
  ["Lukas", "Weber", "Payroll", "Payroll Specialist"],
  ["Sophie", "Klein", "Marketing", "Marketing Manager"],
  ["Tim", "Fischer", "Sales", "Sales Manager"],
  ["Laura", "Becker", "HR", "Recruiter"],
  ["Daniel", "Hoffmann", "Finance", "Controller"],
  ["Marie", "Wagner", "Operations", "Customer Success"],
  ["Jan", "Schulz", "Operations", "Support Specialist"],
  ["Leonie", "Hartmann", "Design", "Designer"],
];

export async function GET() {
  try {
    const db = getAdminDb();

    const companyRef = db.collection("companies").doc();

    await companyRef.set({
      companyName: "Demo GmbH",
      email: "info@demo-gmbh.de",
      phone: "+49 30 123456",
      city: "Berlin",
      taxNumber: "12/345/67890",
      companyNumber: "12345678",
      bgCompanyNumber: "BG123456",
      bgPin: "445566",
      status: "active",
      isDemo: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    const companyId = companyRef.id;
    const employeeIds: string[] = [];

    for (let index = 0; index < employees.length; index++) {
      const [firstName, lastName, department, position] = employees[index];

      const employeeRef = await companyRef.collection("employees").add({
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo-gmbh.de`,
        department,
        position,
        entryDate: index < 2 ? "2026-05-01" : "2025-01-01",
        status: "active",
        taxId: index < 7 ? `1234567890${index}` : "",
        socialSecurityNumber: index < 8 ? `12345678M12${index}` : "",
        healthInsurance: index < 8 ? "TK" : "",
        healthInsuranceName: index < 8 ? "Techniker Krankenkasse" : "",
        iban: index < 9 ? `DE0212030000000020205${index}` : "",
        payrollGroup: "monthly",
        employmentType: "employee",
        missingFields:
          index >= 8
            ? ["Steuer-ID", "Krankenkasse", "Sozialversicherungsnummer"]
            : [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: new Date().toISOString(),
      });

      employeeIds.push(employeeRef.id);
    }

    await companyRef.collection("tasks").add({
      title: "Variable Daten für Mai prüfen",
      description: "Bonus, Zuschläge und Einmalzahlungen kontrollieren.",
      status: "open",
      category: "Payroll",
      payrollRelevant: true,
      dueDate: "2026-05-25",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    await companyRef.collection("tasks").add({
      title: "Fehlende Steuer-ID anfordern",
      description: "Offene Stammdaten bei Mitarbeitern nachfordern.",
      status: "open",
      category: "Stammdaten",
      payrollRelevant: true,
      dueDate: "2026-05-18",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    await companyRef.collection("absences").add({
      employeeId: employeeIds[0],
      employeeName: "Max Mustermann",
      absenceType: "vacation",
      absenceLabel: "Urlaub",
      startDate: "2026-05-12",
      endDate: "2026-05-16",
      status: "approved",
      payrollRelevant: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    await companyRef.collection("absences").add({
      employeeId: employeeIds[2],
      employeeName: "Lukas Weber",
      absenceType: "sickness_with_certificate",
      absenceLabel: "Krankheit mit Attest / eAU",
      startDate: "2026-05-10",
      endDate: "2026-05-14",
      status: "requested",
      requiresEAU: true,
      eauUploaded: false,
      eAUStatus: "to_be_requested",
      payrollRelevant: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    });

    await companyRef.collection("payrollCycles").doc("2026-05").set({
      id: "2026-05",
      month: 4,
      year: 2026,
      status: "in_progress",
      payrollReady: false,
      cutoffDate: "2026-05-25",
      notes: "Demo Payroll Cycle für Präsentation und Tests.",
      steps: [
        {
          key: "masterdata",
          title: "Stammdaten prüfen",
          description: "Eintritte, Austritte, Steuerdaten und SV-Daten prüfen.",
          status: "in_progress",
        },
        {
          key: "absences",
          title: "Fehlzeiten prüfen",
          description: "Urlaub, Krankheit, eAU und Sonderfälle prüfen.",
          status: "open",
        },
        {
          key: "variables",
          title: "Variable Daten",
          description: "Bonus, Zuschläge und Einmalzahlungen erfassen.",
          status: "open",
        },
        {
          key: "review",
          title: "Payroll Review",
          description: "Monatliche Abrechnungsdaten final prüfen.",
          status: "open",
        },
        {
          key: "approval",
          title: "Freigabe",
          description: "Payroll-Lauf freigeben.",
          status: "open",
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      companyId,
      message: "Demo-Mandant erfolgreich erstellt.",
    });
  } catch (error: any) {
    console.error("Seed demo error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Demo-Mandant konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}