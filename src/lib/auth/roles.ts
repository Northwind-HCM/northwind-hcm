// src/lib/auth/roles.ts

export type UserRole =
  | "northwind_admin"
  | "client_admin"
  | "client_hr_admin"
  | "team_lead"
  | "employee";

export type AccessScope =
  | "global"
  | "company"
  | "team"
  | "self";

export type AppUser = {
  uid: string;
  email?: string;
  role: UserRole;
  companyId?: string;
  employeeId?: string;
  accessScope: AccessScope;
  teamEmployeeIds?: string[];
};

export type Permission =
  | "company.view"
  | "company.edit"
  | "employees.view"
  | "employees.edit"
  | "employees.payroll.view"
  | "employees.payroll.edit"
  | "documents.view"
  | "documents.upload"
  | "absences.view"
  | "absences.create"
  | "absences.approve"
  | "tasks.view"
  | "tasks.edit"
  | "admin.full";

const rolePermissions: Record<UserRole, Permission[]> = {
  northwind_admin: [
    "admin.full",
    "company.view",
    "company.edit",
    "employees.view",
    "employees.edit",
    "employees.payroll.view",
    "employees.payroll.edit",
    "documents.view",
    "documents.upload",
    "absences.view",
    "absences.create",
    "absences.approve",
    "tasks.view",
    "tasks.edit",
  ],

  client_admin: [
    "company.view",
    "company.edit",
    "employees.view",
    "employees.edit",
    "employees.payroll.view",
    "employees.payroll.edit",
    "documents.view",
    "documents.upload",
    "absences.view",
    "absences.create",
    "absences.approve",
    "tasks.view",
    "tasks.edit",
  ],

  client_hr_admin: [
    "company.view",
    "company.edit",
    "employees.view",
    "employees.edit",
    "employees.payroll.view",
    "documents.view",
    "documents.upload",
    "absences.view",
    "absences.create",
    "absences.approve",
    "tasks.view",
    "tasks.edit",
  ],

  team_lead: [
    "employees.view",
    "documents.view",
    "absences.view",
    "absences.approve",
    "tasks.view",
  ],

  employee: [
    "documents.view",
    "documents.upload",
    "absences.view",
    "absences.create",
    "tasks.view",
  ],
};

export function hasPermission(
  user: AppUser | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;

  if (user.role === "northwind_admin") return true;

  return rolePermissions[user.role]?.includes(permission) ?? false;
}

export function canAccessCompany(
  user: AppUser | null | undefined,
  companyId: string
): boolean {
  if (!user) return false;

  if (user.role === "northwind_admin") return true;

  return user.companyId === companyId;
}

export function canAccessEmployee(
  user: AppUser | null | undefined,
  target: {
    companyId: string;
    employeeId: string;
  }
): boolean {
  if (!user) return false;

  if (user.role === "northwind_admin") return true;

  if (user.companyId !== target.companyId) return false;

  if (user.role === "client_admin" || user.role === "client_hr_admin") {
    return true;
  }

  if (user.role === "team_lead") {
    return user.teamEmployeeIds?.includes(target.employeeId) ?? false;
  }

  if (user.role === "employee") {
    return user.employeeId === target.employeeId;
  }

  return false;
}

export function canViewPayroll(
  user: AppUser | null | undefined,
  target: {
    companyId: string;
    employeeId: string;
  }
): boolean {
  if (!canAccessEmployee(user, target)) return false;

  return hasPermission(user, "employees.payroll.view");
}

export function canApproveAbsence(
  user: AppUser | null | undefined,
  target: {
    companyId: string;
    employeeId: string;
  }
): boolean {
  if (!canAccessEmployee(user, target)) return false;

  return hasPermission(user, "absences.approve");
}