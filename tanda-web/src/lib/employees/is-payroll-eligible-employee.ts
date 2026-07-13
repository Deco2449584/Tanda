import type { Employee } from '@/lib/types/employee';

/** Employees that belong on payroll reports and accounting exports. */
export function isPayrollEligibleEmployee(
  employee: Pick<Employee, 'role' | 'active'>,
): boolean {
  if (!employee.active) return false;

  const role = (employee.role ?? 'empleado').trim().toLowerCase();
  if (role === 'kiosk' || role === 'master') return false;

  return true;
}
