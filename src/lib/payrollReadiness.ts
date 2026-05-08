type EmployeeData = {
  firstName?: string;
  lastName?: string;
  entryDate?: string;
  employmentType?: string;
  taxId?: string;
  socialSecurityNumber?: string;
  healthInsurance?: string;
  iban?: string;
  privateHealthInsurance?: string;
  disability?: string;
  temporaryAgencyWork?: string;
};

type EmployeeDocument = {
  documentType?: string;
};

export function checkEmployeeReadiness(employee: EmployeeData) {
  const missing: string[] = [];

  if (!employee.firstName) missing.push("Vorname");
  if (!employee.lastName) missing.push("Nachname");
  if (!employee.entryDate) missing.push("Eintrittsdatum");
  if (!employee.employmentType) missing.push("Beschäftigungsart");
  if (!employee.taxId) missing.push("Steuer-ID");
  if (!employee.socialSecurityNumber) missing.push("SV-Nummer");
  if (!employee.healthInsurance) missing.push("Krankenkasse");
  if (!employee.iban) missing.push("IBAN");

  return {
    ready: missing.length === 0,
    missing,
  };
}

export function getRequiredDocumentTypes(employee: EmployeeData) {
  const required = [
    {
      type: "employment_contract",
      label: "Arbeitsvertrag",
    },
  ];

  if (employee.privateHealthInsurance === "yes") {
    required.push({
      type: "private_health_insurance_certificate",
      label: "PKV-Bescheinigung mit Basisbeiträgen",
    });
  }

  if (employee.disability === "yes") {
    required.push({
      type: "disability_certificate",
      label: "Schwerbehindertennachweis",
    });
  }

  if (employee.employmentType === "working_student") {
    required.push({
      type: "student_certificate",
      label: "Immatrikulationsbescheinigung",
    });
  }

  if (employee.temporaryAgencyWork === "yes") {
    required.push({
      type: "temporary_agency_documents",
      label: "AÜG-/Einsatzunterlagen",
    });
  }

  return required;
}

export function checkDocuments(
  employee: EmployeeData,
  documents: EmployeeDocument[]
) {
  const requiredDocuments = getRequiredDocumentTypes(employee);

  const uploadedTypes = documents.map((document) => document.documentType);

  const missing = requiredDocuments
    .filter((required) => !uploadedTypes.includes(required.type))
    .map((required) => required.label);

  return {
    ready: missing.length === 0,
    missing,
  };
}