export type PayrollIssueSeverity = "info" | "warning" | "critical";

export type PayrollIssueCategory =
  | "masterdata"
  | "absence"
  | "documents"
  | "payroll"
  | "tax"
  | "social_security"
  | "tasks";

export type PayrollIssue = {
  type: string;
  title: string;
  description: string;
  severity: PayrollIssueSeverity;
  category: PayrollIssueCategory;
  employeeId?: string;
  employeeName?: string;
};

export type PayrollReadinessResult = {
  payrollReady: boolean;
  score: number;
  issues: PayrollIssue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
};

type Employee = {
  id: string;
  firstName?: string;
  lastName?: string;

  status?: string;

  taxId?: string;
  socialSecurityNumber?: string;
  healthInsuranceName?: string;
  iban?: string;

  entryDate?: string;
  exitDate?: string;

  employmentType?: string;
  payrollGroup?: string;

  missingFields?: string[];
};

type Absence = {
  id: string;
  employeeId?: string;
  employeeName?: string;

  absenceType?: string;

  status?: string;

  requiresEAU?: boolean;
  eauUploaded?: boolean;
};

type Task = {
  id: string;
  title?: string;

  payrollRelevant?: boolean;

  status?: string;
};

function fullName(employee: Employee) {
  return `${employee.firstName || ""} ${
    employee.lastName || ""
  }`.trim();
}

function addIssue(
  issues: PayrollIssue[],
  issue: PayrollIssue
) {
  issues.push(issue);
}

export function calculatePayrollReadiness(params: {
  employees: Employee[];
  absences: Absence[];
  tasks: Task[];
}): PayrollReadinessResult {
  const { employees, absences, tasks } = params;

  const issues: PayrollIssue[] = [];

  const activeEmployees = employees.filter(
    (employee) => employee.status !== "archived"
  );

  for (const employee of activeEmployees) {
    const employeeName = fullName(employee);

    if (!employee.taxId) {
      addIssue(issues, {
        type: "missing_tax_id",
        title: "Steuer-ID fehlt",
        description:
          "Für den Mitarbeiter fehlt die Steuer-ID.",
        severity: "critical",
        category: "tax",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.socialSecurityNumber) {
      addIssue(issues, {
        type: "missing_social_security_number",
        title: "Sozialversicherungsnummer fehlt",
        description:
          "Die Sozialversicherungsnummer ist nicht gepflegt.",
        severity: "critical",
        category: "social_security",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.healthInsuranceName) {
      addIssue(issues, {
        type: "missing_health_insurance",
        title: "Krankenkasse fehlt",
        description:
          "Es ist keine Krankenkasse hinterlegt.",
        severity: "critical",
        category: "social_security",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.iban) {
      addIssue(issues, {
        type: "missing_iban",
        title: "IBAN fehlt",
        description:
          "Keine Bankverbindung für die Auszahlung vorhanden.",
        severity: "warning",
        category: "payroll",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.entryDate) {
      addIssue(issues, {
        type: "missing_entry_date",
        title: "Eintrittsdatum fehlt",
        description:
          "Es wurde kein Eintrittsdatum gepflegt.",
        severity: "critical",
        category: "masterdata",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.employmentType) {
      addIssue(issues, {
        type: "missing_employment_type",
        title: "Beschäftigungsart fehlt",
        description:
          "Die Beschäftigungsart ist nicht gepflegt.",
        severity: "warning",
        category: "masterdata",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (!employee.payrollGroup) {
      addIssue(issues, {
        type: "missing_payroll_group",
        title: "Payroll-Gruppe fehlt",
        description:
          "Keine Payroll-Gruppe hinterlegt.",
        severity: "warning",
        category: "payroll",
        employeeId: employee.id,
        employeeName,
      });
    }

    if (
      employee.missingFields &&
      employee.missingFields.length > 0
    ) {
      addIssue(issues, {
        type: "missing_required_fields",
        title: "Pflichtfelder fehlen",
        description: `Offene Pflichtfelder: ${employee.missingFields.join(
          ", "
        )}`,
        severity: "warning",
        category: "masterdata",
        employeeId: employee.id,
        employeeName,
      });
    }
  }

  for (const absence of absences) {
    if (
      absence.requiresEAU &&
      !absence.eauUploaded
    ) {
      addIssue(issues, {
        type: "missing_eau",
        title: "eAU fehlt",
        description:
          "Für die Krankmeldung liegt noch keine eAU vor.",
        severity: "critical",
        category: "absence",
        employeeId: absence.employeeId,
        employeeName: absence.employeeName,
      });
    }

    if (
      absence.status !== "approved" &&
      absence.status !== "rejected"
    ) {
      addIssue(issues, {
        type: "open_absence",
        title: "Offene Fehlzeit",
        description:
          "Eine Fehlzeit wurde noch nicht genehmigt.",
        severity: "warning",
        category: "absence",
        employeeId: absence.employeeId,
        employeeName: absence.employeeName,
      });
    }
  }

  for (const task of tasks) {
    if (
      task.payrollRelevant &&
      task.status !== "done"
    ) {
      addIssue(issues, {
        type: "open_payroll_task",
        title: "Offene Payroll-Aufgabe",
        description:
          task.title || "Eine Payroll-Aufgabe ist noch offen.",
        severity: "warning",
        category: "tasks",
      });
    }
  }

  const criticalCount = issues.filter(
    (issue) => issue.severity === "critical"
  ).length;

  const warningCount = issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  const infoCount = issues.filter(
    (issue) => issue.severity === "info"
  ).length;

  let score = 100;

  score -= criticalCount * 15;
  score -= warningCount * 5;
  score -= infoCount * 1;

  if (score < 0) {
    score = 0;
  }

  const payrollReady = criticalCount === 0;

  return {
    payrollReady,
    score,
    issues,
    criticalCount,
    warningCount,
    infoCount,
  };
}