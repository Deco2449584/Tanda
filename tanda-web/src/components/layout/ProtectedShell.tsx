'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthRole } from '@/hooks/useAuthRole';
import { getRedirectForRole } from '@/lib/auth/routes';
import type { UserRole } from '@/lib/auth/roles';

interface ProtectedShellProps {
  children: React.ReactNode;
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
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
    return <LoadingScreen message="Cargando sesión..." />;
  }

  if (!user || !role) {
    return <LoadingScreen message="Cerrando sesión..." />;
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
    <RouteGuard role={role}>
      <ProtectedLayoutContent role={role}>{children}</ProtectedLayoutContent>
    </RouteGuard>
  );
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
    return <LoadingScreen message="Redirigiendo..." />;
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

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <Sidebar
        role={role}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
