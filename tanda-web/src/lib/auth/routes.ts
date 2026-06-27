export const EMPLOYEE_ROUTES = [
  '/employee-dashboard',
  '/my-records',
  '/my-schedule',
  '/my-requests',
] as const;

export function isEmployeeOnlyRoute(pathname: string): boolean {
  return EMPLOYEE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isRouteAllowedForEmployee(pathname: string): boolean {
  if (/^\/announcements\/[^/]+$/.test(pathname)) {
    return true;
  }

  return isEmployeeOnlyRoute(pathname);
}

import type { UserRole } from '@/lib/auth/roles';

export function getRedirectForRole(
  role: UserRole,
  pathname: string,
): string | null {
  if (role === 'kiosk') {
    return '/kiosk';
  }

  if (role === 'empleado' && !isRouteAllowedForEmployee(pathname)) {
    return '/employee-dashboard';
  }

  if (role === 'admin' && isEmployeeOnlyRoute(pathname)) {
    return '/dashboard';
  }

  return null;
}
