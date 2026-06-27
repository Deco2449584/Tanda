import { resolveRoleFromEmployee, type EmployeeRoleSource } from '@/lib/auth/resolve-role';

/** Admin and master accounts cannot be deleted from staff management. */
export function isProtectedAdminEmployee(
  employee: EmployeeRoleSource | null | undefined,
): boolean {
  const role = resolveRoleFromEmployee(employee);
  return role === 'admin' || role === 'master';
}
