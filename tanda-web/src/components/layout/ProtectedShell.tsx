'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { LoadingSplash } from '@/components/ui/LoadingSplash';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { getRedirectForRole } from '@/lib/auth/routes';
import type { UserRole } from '@/lib/auth/roles';
import { isAdminAreaRole } from '@/lib/auth/roles';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { AdminAccessProvider } from '@/providers/AdminAccessProvider';
import { useAttendanceAlertSync } from '@/hooks/useAttendanceAlertSync';
import { EmployeesProvider } from '@/providers/EmployeesProvider';
import { EmployeeShiftNotificationsProvider } from '@/providers/EmployeeShiftNotificationsProvider';
import { LocationsProvider } from '@/providers/LocationsProvider';
import { LocationGroupsProvider } from '@/providers/LocationGroupsProvider';
import { DepartmentsProvider } from '@/providers/DepartmentsProvider';

interface ProtectedShellProps {
  children: React.ReactNode;
}

function LoadingScreen({ message }: { message: string }) {
  return <LoadingSplash message={message} />;
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const { user, role, loading } = useAuthRole();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return <LoadingScreen message="Loading session…" />;
  }

  if (!user || !role) {
    return <LoadingScreen message="Signing out…" />;
  }

  return <AuthenticatedShell role={role}>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  return (
    <AdminAccessProvider>
      {isAdminAreaRole(role) ? (
        <AdminRouteGuard role={role}>
          <ProtectedLayoutContent role={role}>{children}</ProtectedLayoutContent>
        </AdminRouteGuard>
      ) : (
        <RouteGuard role={role}>
          <ProtectedLayoutContent role={role}>{children}</ProtectedLayoutContent>
        </RouteGuard>
      )}
    </AdminAccessProvider>
  );
}

function AdminRouteGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { access, loading } = useAdminAccess();
  const redirectTo = loading ? null : getRedirectForRole(role, pathname, access);

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (loading || redirectTo) {
    return <LoadingScreen message={loading ? 'Loading access…' : 'Redirecting…'} />;
  }

  return <>{children}</>;
}

function RouteGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const redirectTo = getRedirectForRole(role, pathname);

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (redirectTo) {
    return <LoadingScreen message="Redirecting…" />;
  }

  return <>{children}</>;
}

function ProtectedLayoutContent({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthRole();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const layout = (
    <>
      <PushNotificationSetup />
      <div className="flex h-screen overflow-hidden bg-surface-base">
      <Sidebar
        role={role}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header role={role} onMenuClick={() => setSidebarOpen(true)} />
        <main className="relative z-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
    </>
  );

  if (isAdminAreaRole(role)) {
    return (
      <AdminAttendanceSync>
        <EmployeesProvider>
          <LocationsProvider>
            <DepartmentsProvider>
              <LocationGroupsProvider>{layout}</LocationGroupsProvider>
            </DepartmentsProvider>
          </LocationsProvider>
        </EmployeesProvider>
      </AdminAttendanceSync>
    );
  }

  return (
    <EmployeeNotificationsShell userEmail={user?.email}>
      {layout}
    </EmployeeNotificationsShell>
  );
}

function AdminAttendanceSync({ children }: { children: React.ReactNode }) {
  useAttendanceAlertSync(true);
  return <>{children}</>;
}

function EmployeeNotificationsShell({
  userEmail,
  children,
}: {
  userEmail: string | null | undefined;
  children: React.ReactNode;
}) {
  const { employee, loading } = useCurrentEmployee(userEmail);

  if (loading) {
    return <LoadingScreen message="Loading profile…" />;
  }

  return (
    <EmployeeShiftNotificationsProvider
      userEmail={userEmail ?? ''}
      employeeCode={employee?.employeeId ?? ''}
    >
      {children}
    </EmployeeShiftNotificationsProvider>
  );
}
