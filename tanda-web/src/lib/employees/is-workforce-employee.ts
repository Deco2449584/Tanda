/**
 * Workforce staff only — excludes system administration and device accounts
 * (admin, master, kiosk). Used for schedule, announcements, and accounting rates.
 */
export function isWorkforceEmployeeRole(
  role: string | null | undefined,
): boolean {
  const normalized = (role ?? 'empleado').trim().toLowerCase();
  return (
    normalized !== 'admin' &&
    normalized !== 'master' &&
    normalized !== 'kiosk'
  );
}

export function isWorkforceEmployee(employee: {
  role?: string | null;
  active?: boolean;
}): boolean {
  if (employee.active === false) return false;
  return isWorkforceEmployeeRole(employee.role);
}
