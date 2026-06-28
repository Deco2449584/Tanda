import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole } from '@/lib/auth/roles';
import type { ResolvedAdminAccess } from '@/lib/types/admin-permissions';
import { canAccessPath, getDefaultAdminHref } from '@/lib/auth/admin-permissions';

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

  if (pathname === '/help' || pathname.startsWith('/help/')) {
    return true;
  }

  if (pathname === '/report-issue' || pathname.startsWith('/report-issue/')) {
    return true;
  }

  return isEmployeeOnlyRoute(pathname);
}

export function getRedirectForRole(
  role: UserRole,
  pathname: string,
  access?: ResolvedAdminAccess | null,
): string | null {
  if (role === 'kiosk') {
    return '/kiosk';
  }

  if (role === 'empleado' && !isRouteAllowedForEmployee(pathname)) {
    return '/employee-dashboard';
  }

  if (isAdminAreaRole(role) && isEmployeeOnlyRoute(pathname)) {
    return access ? getDefaultAdminHref(access) : '/dashboard';
  }

  if (role === 'admin' && access && !canAccessPath(access, pathname)) {
    return getDefaultAdminHref(access);
  }

  return null;
}
