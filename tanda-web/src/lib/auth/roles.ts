export const ADMIN_EMAIL = 'admin@gmail.com';

export type UserRole = 'admin' | 'empleado';

export function getRoleFromEmail(email: string | null | undefined): UserRole {
  return email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'empleado';
}

export function getHomeRouteForRole(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/employee-dashboard';
}
