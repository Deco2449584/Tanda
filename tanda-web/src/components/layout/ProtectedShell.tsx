'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthRole } from '@/hooks/useAuthRole';
import type { UserRole } from '@/lib/auth/roles';

interface ProtectedShellProps {
  children: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
      <p className="text-sm text-zinc-400">Cargando sesión...</p>
    </div>
  );
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const { loading, role } = useAuthRole();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedLayoutContent role={role}>{children}</ProtectedLayoutContent>
  );
}

function ProtectedLayoutContent({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0a]">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
