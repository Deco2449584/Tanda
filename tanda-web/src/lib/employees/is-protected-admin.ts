import { resolveRoleFromEmployee, type EmployeeRoleSource } from '@/lib/auth/resolve-role';

/** Admin and master accounts cannot be deleted from staff management by default. */
export function isProtectedAdminEmployee(
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  const role = resolveRoleFromEmployee(employee);
  return role === 'admin' || role === 'master';
}

export function isMasterEmployee(
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  return resolveRoleFromEmployee(employee) === 'master';
}

export function isAdminEmployee(
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  return resolveRoleFromEmployee(employee) === 'admin';
}

/**
 * Master accounts are editable only by another master.
 * Administrators with employees.update still cannot edit Master.
 */
export function canEditStaffAccount(
  viewerIsMaster: boolean,
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  if (!isMasterEmployee(employee)) return true;
  return viewerIsMaster;
}

/**
 * - Master accounts cannot be deleted.
 * - Administrator accounts can be deleted only by a Master.
 * - Workforce / kiosk accounts follow normal delete permission.
 */
export function canDeleteStaffAccount(
  viewerIsMaster: boolean,
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  if (isMasterEmployee(employee)) return false;
  if (isAdminEmployee(employee)) return viewerIsMaster;
  return true;
}
