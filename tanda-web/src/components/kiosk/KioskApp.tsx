'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldX } from 'lucide-react';
import { KioskActivation } from '@/components/kiosk/KioskActivation';
import { KioskLockedShell } from '@/components/kiosk/KioskLockedShell';
import { KioskScreen } from '@/components/kiosk/KioskScreen';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { getHomeRouteForRole } from '@/lib/auth/roles';
import { clearKioskDeviceToken, kioskDeviceHeaders } from '@/lib/kiosk/device-token';
import { exitKioskFullscreen } from '@/lib/pwa/kiosk-display';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

type Phase = 'loading' | 'denied' | 'setup' | 'ready';

function KioskMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
      <CompanyLogo variant="light" className="h-auto w-44 object-contain opacity-90" />
      {children}
    </div>
  );
}

export function KioskApp() {
  const router = useRouter();
  const { user, role, loading: authLoading, signOutUser } = useAuthRole();
  const { employee, loading: employeeLoading } = useCurrentEmployee(user?.email);

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<KioskDeviceSession | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/kiosk');
    }
  }, [authLoading, user, router]);

  const isKioskAccount = role === 'kiosk';
  const hasAccess =
    role === 'kiosk' || role === 'admin' || employee?.kioskEnabled === true;

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/kiosk/devices/session', {
        headers: kioskDeviceHeaders(),
      });
      const data = (await response.json().catch(() => null)) as
        | { session: KioskDeviceSession | null }
        | null;

      if (data?.session) {
        setSession(data.session);
        setPhase('ready');
      } else {
        setSession(null);
        setPhase('setup');
      }
    } catch {
      setSession(null);
      setPhase('setup');
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user || employeeLoading) return;

    if (!hasAccess) {
      setPhase('denied');
      return;
    }

    void loadSession();
  }, [authLoading, user, employeeLoading, hasAccess, loadSession]);

  const handleActivated = useCallback((next: KioskDeviceSession) => {
    setSession(next);
    setPhase('ready');
  }, []);

  const handleExitLocked = useCallback(async () => {
    await exitKioskFullscreen();
    clearKioskDeviceToken();
    setSession(null);
    await signOutUser();
  }, [signOutUser]);

  const handleExitUnlocked = useCallback(() => {
    router.push(getHomeRouteForRole(role ?? 'empleado'));
  }, [role, router]);

  if (authLoading || !user || (hasAccess && employeeLoading) || phase === 'loading') {
    return (
      <KioskMessage>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-zinc-400">Connecting kiosk…</p>
      </KioskMessage>
    );
  }

  if (phase === 'denied') {
    return (
      <KioskMessage>
        <ShieldX className="h-10 w-10 text-red-400" />
        <h1 className="text-lg font-semibold text-white">Kiosk access not enabled</h1>
        <p className="max-w-md text-sm text-zinc-400">
          Your account is not allowed to use the kiosk. Ask an administrator to enable
          the kiosk module for you.
        </p>
        <button
          type="button"
          onClick={() => router.push(getHomeRouteForRole(role ?? 'empleado'))}
          className="mt-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Go back
        </button>
      </KioskMessage>
    );
  }

  if (phase === 'setup') {
    return (
      <KioskActivation
        mode={isKioskAccount ? 'tablet' : 'mobile'}
        defaultLocationId={employee?.locationId ?? ''}
        defaultName={employee?.name ?? ''}
        onActivated={handleActivated}
        onCancel={isKioskAccount ? undefined : handleExitUnlocked}
      />
    );
  }

  if (phase === 'ready' && session) {
    if (session.locked) {
      return (
        <KioskLockedShell session={session} onExit={handleExitLocked}>
          <KioskScreen deviceSession={session} />
        </KioskLockedShell>
      );
    }

    return (
      <KioskScreen deviceSession={session} onExit={handleExitUnlocked} exitLabel="Exit" />
    );
  }

  return null;
}
