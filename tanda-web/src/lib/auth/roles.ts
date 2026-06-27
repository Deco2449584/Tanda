export type UserRole = 'master' | 'admin' | 'empleado' | 'kiosk';

export function isAdminAreaRole(role: UserRole): boolean {
  return role === 'admin' || role === 'master';
}

export function isMasterRole(role: UserRole): boolean {
  return role === 'master';
}

export function getHomeRouteForRole(role: UserRole): string {
  if (isAdminAreaRole(role)) return '/dashboard';
  if (role === 'kiosk') return '/kiosk';
  return '/employee-dashboard';
}

export function getRoleLabel(role: UserRole): string {
  if (role === 'master') return 'Master';
  if (role === 'admin') return 'Administrator';
  if (role === 'kiosk') return 'Kiosk';
  return 'Employee';
}
