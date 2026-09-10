import { isWorkforceEmployee } from '@/lib/employees/is-workforce-employee';
import type { Employee } from '@/lib/types/employee';

/** Employees that belong on payroll reports and accounting staff rates. */
export function isPayrollEligibleEmployee(
  employee: Pick<Employee, 'role' | 'active'>,
): boolean {
  return isWorkforceEmployee(employee);
}
