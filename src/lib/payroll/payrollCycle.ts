export type PayrollCycleStatus =
  | "open"
  | "in_progress"
  | "ready_for_review"
  | "approved"
  | "closed";

export type PayrollCycleStepStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "blocked";

export type PayrollCycleStep = {
  key: string;
  title: string;
  description: string;
  status: PayrollCycleStepStatus;
};

export type PayrollCycle = {
  id: string;
  month: number;
  year: number;
  status: PayrollCycleStatus;
  cutoffDate?: string;
  payrollReady?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  closedAt?: string;
  closedBy?: string;
  notes?: string;
  steps: PayrollCycleStep[];
  createdAt?: string;
  updatedAt?: string;
};

export function getPayrollCycleId(year: number, month: number) {
  const monthNumber = String(month + 1).padStart(2, "0");
  return `${year}-${monthNumber}`;
}

export function getDefaultPayrollSteps(): PayrollCycleStep[] {
  return [
    {
      key: "masterdata",
      title: "Stammdaten prüfen",
      description:
        "Eintritte, Austritte, Steuerdaten, SV-Daten und Bankverbindungen prüfen.",
      status: "open",
    },
    {
      key: "absences",
      title: "Fehlzeiten prüfen",
      description:
        "Urlaub, Krankheit, eAU, Elternzeit, Mutterschutz und Sonderfälle prüfen.",
      status: "open",
    },
    {
      key: "variables",
      title: "Variable Daten",
      description:
        "Bonus, Zuschläge, Überstunden, Provisionen und Einmalzahlungen erfassen.",
      status: "open",
    },
    {
      key: "review",
      title: "Payroll Review",
      description:
        "Monatliche Abrechnungsdaten final prüfen und zur Freigabe vorbereiten.",
      status: "open",
    },
    {
      key: "approval",
      title: "Freigabe",
      description:
        "Payroll-Lauf freigeben und für Export / Verarbeitung markieren.",
      status: "open",
    },
  ];
}

export function getDefaultPayrollCycle(params: {
  year: number;
  month: number;
}): PayrollCycle {
  const { year, month } = params;

  return {
    id: getPayrollCycleId(year, month),
    year,
    month,
    status: "open",
    payrollReady: false,
    notes: "",
    steps: getDefaultPayrollSteps(),
  };
}