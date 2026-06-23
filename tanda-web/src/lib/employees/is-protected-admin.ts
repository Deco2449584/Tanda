import { resolveRoleFromEmployee, type EmployeeRoleSource } from '@/lib/auth/resolve-role';

/** Admin accounts tied to web access cannot be deleted from staff management. */
export function isProtectedAdminEmployee(
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  return resolveRoleFromEmployee(employee) === 'admin';
}
