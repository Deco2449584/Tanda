import type { Employee } from '@/lib/types/employee';

/** Employees that can appear on the schedule grid and shift assignment. */
export function isSchedulableEmployee(
  employee: Pick<Employee, 'role' | 'active'>,
): boolean {
  if (!employee.active) return false;

  const role = (employee.role ?? 'empleado').trim().toLowerCase();
  if (role === 'master' || role === 'kiosk') return false;

  return true;
}
