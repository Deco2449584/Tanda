import { deriveAccessRole } from '@/lib/employees/employee-to-form';
import type { Employee } from '@/lib/types/employee';

export type EmployeeAccessFilter = 'all' | 'kiosk' | 'admins' | 'empleados';

export const EMPLOYEE_ACCESS_FILTER_OPTIONS: Array<{
  id: EmployeeAccessFilter;
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'kiosk', label: 'Kiosk' },
  { id: 'admins', label: 'Admins' },
  { id: 'empleados', label: 'Employees' },
];

export function matchesEmployeeAccessFilter(
  employee: Employee,
  filter: EmployeeAccessFilter,
): boolean {
  if (filter === 'all') return true;

  const role = deriveAccessRole(employee);

  if (filter === 'kiosk') return role === 'kiosk';
  if (filter === 'admins') return role === 'admin' || role === 'master';
  return role === 'empleado';
}
