export type UserRole = 'admin' | 'empleado' | 'kiosk';

export function getHomeRouteForRole(role: UserRole): string {
  if (role === 'admin') return '/dashboard';
  if (role === 'kiosk') return '/kiosk';
  return '/employee-dashboard';
}
