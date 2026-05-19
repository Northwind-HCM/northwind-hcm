export type Locale = "de" | "en";

export const translations = {
  de: {
    navigation: {
      dashboard: "Dashboard",
      monthly: "Monatsübersicht",
      tasks: "Aufgaben",
      companyData: "Firmenstammdaten",
      employees: "Mitarbeiter",
      payroll: "Payroll",
      absences: "Fehlzeiten",
      settings: "Einstellungen",
    },
    common: {
      back: "Zurück",
      save: "Speichern",
      cancel: "Abbrechen",
      loading: "Lädt...",
      search: "Suchen...",
      status: "Status",
      actions: "Aktionen",
    },
    payroll: {
      readiness: "Payroll Readiness",
      ready: "Bereit",
      notReady: "Nicht bereit",
      monthlyOverview: "Monatsübersicht",
      payrollWorkflow: "Payroll Workflow",
    },
  },

  en: {
    navigation: {
      dashboard: "Dashboard",
      monthly: "Monthly Overview",
      tasks: "Tasks",
      companyData: "Company Data",
      employees: "Employees",
      payroll: "Payroll",
      absences: "Absences",
      settings: "Settings",
    },
    common: {
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      search: "Search...",
      status: "Status",
      actions: "Actions",
    },
    payroll: {
      readiness: "Payroll Readiness",
      ready: "Ready",
      notReady: "Not Ready",
      monthlyOverview: "Monthly Overview",
      payrollWorkflow: "Payroll Workflow",
    },
  },
} as const;

export function getTranslations(locale: Locale = "de") {
  return translations[locale] || translations.de;
}