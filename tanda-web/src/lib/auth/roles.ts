export type UserRole = 'admin' | 'empleado';

export function getHomeRouteForRole(role: UserRole): string {
  return role === 'admin' ? '/dashboard' : '/employee-dashboard';
}
