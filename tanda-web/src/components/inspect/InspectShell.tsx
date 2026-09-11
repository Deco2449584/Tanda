'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PackageSearch } from 'lucide-react';
import { InspectTabBar } from '@/components/inspect/InspectTabBar';
import { LoadingSplash } from '@/components/ui/LoadingSplash';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import {
  useInspectPwa,
  usePendingUploadUnloadGuard,
} from '@/hooks/useInspectPwa';
import { resolveInspectAccess } from '@/lib/inspect/access';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { InspectInspectionsProvider } from '@/providers/InspectInspectionsProvider';
import { InspectSessionProvider } from '@/providers/InspectSessionProvider';

function AccessDenied({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
        <PackageSearch className="h-7 w-7 text-subtle" aria-hidden />
      </span>
      <div>
        <h1 className="font-display text-xl text-foreground">
          {INSPECT_BRAND.appName}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted">{message}</p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
      >
        Back to workspace
      </Link>
    </div>
  );
}

export function InspectShell({ children }: { children: ReactNode }) {
  const { user, role, loading: authLoading } = useAuthRole();
  const router = useRouter();
  const { employee, loading: employeeLoading } = useCurrentEmployee(
    user?.email,
  );

  useInspectPwa();
  usePendingUploadUnloadGuard();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/inspect');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <LoadingSplash message="Loading session…" />;
  }

  if (employeeLoading) {
    return <LoadingSplash message="Loading profile…" />;
  }

  const { canUseInspect, isInspectAdmin } = resolveInspectAccess(
    employee,
    role,
  );

  if (!canUseInspect) {
    return (
      <AccessDenied message="Your account does not have Continental Inspect enabled. Ask an administrator to turn it on for you in Staff settings." />
    );
  }

  return (
    <InspectSessionProvider
      user={user}
      employee={employee}
      isInspectAdmin={isInspectAdmin}
    >
      <InspectInspectionsProvider
        scopeToUserId={isInspectAdmin ? null : user.uid}
      >
        <div className="flex min-h-[100dvh] flex-col bg-surface-base text-foreground">
          <main className="flex-1 pb-4">{children}</main>
          <InspectTabBar isInspectAdmin={isInspectAdmin} />
        </div>
      </InspectInspectionsProvider>
    </InspectSessionProvider>
  );
}
