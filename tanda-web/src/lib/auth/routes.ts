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
  return isEmployeeOnlyRoute(pathname);
}

export function getRedirectForRole(
  role: 'admin' | 'empleado',
  pathname: string,
): string | null {
  if (role === 'empleado' && !isRouteAllowedForEmployee(pathname)) {
    return '/employee-dashboard';
  }

  if (role === 'admin' && isEmployeeOnlyRoute(pathname)) {
    return '/dashboard';
  }

  return null;
}
