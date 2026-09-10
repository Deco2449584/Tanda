import { isWorkforceEmployee } from '@/lib/employees/is-workforce-employee';
import type { Employee } from '@/lib/types/employee';

/** Employees that can appear on the schedule grid and shift assignment. */
export function isSchedulableEmployee(
  employee: Pick<Employee, 'role' | 'active'>,
): boolean {
  return isWorkforceEmployee(employee);
}
