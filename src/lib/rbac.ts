export type UserRole =
  | "northwind_admin"
  | "client_hr_admin"
  | "team_lead"
  | "employee";

export type AppUser = {
  uid: string;
  email?: string;
  role: UserRole;
  companyIds?: string[];
  companyId?: string;
  employeeId?: string;
  teamIds?: string[];
};

export function isNorthwindAdmin(user?: AppUser | null) {
  return user?.role === "northwind_admin";
}

export function isClientHrAdmin(user?: AppUser | null) {
  return user?.role === "client_hr_admin";
}

export function isTeamLead(user?: AppUser | null) {
  return user?.role === "team_lead";
}

export function isEmployee(user?: AppUser | null) {
  return user?.role === "employee";
}

export function canAccessCompany(user: AppUser | null, companyId: string) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (user.companyId === companyId) return true;

  if (user.companyIds?.includes(companyId)) return true;

  return false;
}

export function canViewPayroll(user: AppUser | null, companyId: string) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  return false;
}

export function canEditPayroll(user: AppUser | null, companyId: string) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  return false;
}

export function canApprovePayroll(user: AppUser | null, companyId: string) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  return false;
}

export function canViewEmployee(
  user: AppUser | null,
  companyId: string,
  employeeId: string
) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  if (
    isEmployee(user) &&
    user.companyId === companyId &&
    user.employeeId === employeeId
  ) {
    return true;
  }

  return false;
}

export function canEditEmployee(
  user: AppUser | null,
  companyId: string,
  employeeId: string
) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  if (
    isEmployee(user) &&
    user.companyId === companyId &&
    user.employeeId === employeeId
  ) {
    return true;
  }

  return false;
}

export function canUploadDocuments(
  user: AppUser | null,
  companyId: string,
  employeeId?: string
) {
  if (!user) return false;

  if (isNorthwindAdmin(user)) return true;

  if (isClientHrAdmin(user) && canAccessCompany(user, companyId)) {
    return true;
  }

  if (
    isEmployee(user) &&
    user.companyId === companyId &&
    user.employeeId &&
    employeeId &&
    user.employeeId === employeeId
  ) {
    return true;
  }

  return false;
}

export function canViewNorthwindInbox(user: AppUser | null) {
  if (!user) return false;

  return isNorthwindAdmin(user);
}