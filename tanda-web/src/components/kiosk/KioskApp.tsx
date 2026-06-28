'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldX } from 'lucide-react';
import { KioskActivation } from '@/components/kiosk/KioskActivation';
import { KioskIdleScreen } from '@/components/kiosk/KioskIdleScreen';
import { KioskLockedShell } from '@/components/kiosk/KioskLockedShell';
import { KioskPendingScreen } from '@/components/kiosk/KioskPendingScreen';
import { KioskPinGate } from '@/components/kiosk/KioskPinGate';
import { KioskRevokedScreen } from '@/components/kiosk/KioskRevokedScreen';
import { KioskScreen } from '@/components/kiosk/KioskScreen';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { getHomeRouteForRole, isAdminAreaRole } from '@/lib/auth/roles';
import { auth } from '@/lib/firebase';
import {
  clearKioskDeviceToken,
  ensureKioskClientSessionId,
  getKioskDeviceToken,
  kioskDeviceHeaders,
} from '@/lib/kiosk/device-token';
import {
  clearKioskModeActive,
  isKioskModeActive,
  setKioskModeActive,
} from '@/lib/kiosk/kiosk-lock-state';
import { enterKioskFullscreen, exitKioskFullscreen } from '@/lib/pwa/kiosk-display';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

type Phase = 'loading' | 'denied' | 'setup' | 'pending' | 'revoked' | 'ready';
type LockedView = 'idle' | 'enter-pin' | 'active';

function KioskMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk-ambient flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <CompanyLogo variant="light" className="h-auto w-44 object-contain opacity-90" />
      {children}
    </div>
  );
}

export function KioskApp() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading } = useCurrentEmployee(user?.email);

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<KioskDeviceSession | null>(null);
  const [lockedView, setLockedView] = useState<LockedView>('idle');

  const dashboardRoute = getHomeRouteForRole(role ?? 'empleado');
  const isKioskAccount = role === 'kiosk';
  const hasAccess =
    role === 'kiosk' ||
    isAdminAreaRole(role ?? 'empleado') ||
    employee?.kioskEnabled === true;
  const canLeaveToDashboard = !isKioskAccount;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/kiosk');
    }
  }, [authLoading, user, router]);

  const loadSession = useCallback(async () => {
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setSession(null);
      setPhase('setup');
      setLockedView('idle');
      return;
    }

    ensureKioskClientSessionId();

    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/kiosk/devices/session', {
        headers: {
          ...kioskDeviceHeaders(),
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = (await response.json().catch(() => null)) as
        | {
            session: KioskDeviceSession | null;
            pendingDevice: KioskDeviceSession | null;
            revokedDevice: KioskDeviceSession | null;
            resetToken?: boolean;
          }
        | null;

      if (data?.resetToken) {
        clearKioskDeviceToken();
        clearKioskModeActive();
        setSession(null);
        setPhase('setup');
        setLockedView('idle');
        return;
      }

      if (data?.revokedDevice) {
        setSession(data.revokedDevice);
        setPhase('revoked');
        clearKioskModeActive();
        setLockedView('idle');
        return;
      }

      if (data?.session) {
        setSession(data.session);
        setPhase('ready');

        if (data.session.locked) {
          setLockedView(isKioskModeActive() ? 'active' : 'idle');
        } else {
          clearKioskModeActive();
          setLockedView('idle');
        }
        return;
      }

      if (data?.pendingDevice) {
        setSession(data.pendingDevice);
        setPhase('pending');
        clearKioskModeActive();
        setLockedView('idle');
        return;
      }

      clearKioskModeActive();
      setSession(null);
      setPhase('setup');
      setLockedView('idle');
    } catch {
      setSession(null);
      setPhase('setup');
      setLockedView('idle');
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

  useEffect(() => {
    if (phase !== 'pending') return;

    const interval = window.setInterval(() => {
      void loadSession();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [phase, loadSession]);

  const enterKioskMode = useCallback(async () => {
    setKioskModeActive(true);
    setLockedView('active');
    await enterKioskFullscreen();
  }, []);

  const handleRerequested = useCallback(
    (next: KioskDeviceSession) => {
      setSession(next);
      if (next.status === 'pending') {
        setPhase('pending');
        clearKioskModeActive();
        setLockedView('idle');
        return;
      }

      setPhase('ready');
      if (next.locked) {
        setLockedView('idle');
      } else {
        clearKioskModeActive();
        setLockedView('idle');
      }
    },
    [],
  );

  const handleActivated = useCallback(
    async (next: KioskDeviceSession) => {
      setSession(next);

      if (next.status === 'pending') {
        setPhase('pending');
        clearKioskModeActive();
        setLockedView('idle');
        return;
      }

      setPhase('ready');

      if (next.locked) {
        await enterKioskMode();
      } else {
        clearKioskModeActive();
        setLockedView('idle');
      }
    },
    [enterKioskMode],
  );

  const handleExitKiosk = useCallback(async () => {
    clearKioskModeActive();
    setLockedView('idle');
    await exitKioskFullscreen();

    if (canLeaveToDashboard) {
      router.replace(dashboardRoute);
    }
  }, [canLeaveToDashboard, dashboardRoute, router]);

  const handleExitUnlocked = useCallback(() => {
    router.push(dashboardRoute);
  }, [dashboardRoute, router]);

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
          onClick={() => router.push(dashboardRoute)}
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
        defaultMode={isKioskAccount ? 'tablet' : 'mobile'}
        defaultLocationId={employee?.locationId ?? ''}
        defaultName={employee?.name ?? ''}
        onActivated={(next) => void handleActivated(next)}
        onCancel={canLeaveToDashboard ? handleExitUnlocked : undefined}
      />
    );
  }

  if (phase === 'revoked' && session) {
    return (
      <KioskRevokedScreen
        session={session}
        onRerequested={handleRerequested}
        onGoToDashboard={canLeaveToDashboard ? handleExitUnlocked : undefined}
      />
    );
  }

  if (phase === 'pending' && session) {
    return (
      <KioskPendingScreen
        session={session}
        onGoToDashboard={canLeaveToDashboard ? handleExitUnlocked : undefined}
      />
    );
  }

  if (phase === 'ready' && session) {
    if (session.locked) {
      if (lockedView === 'enter-pin') {
        return (
          <KioskPinGate
            title="Enter kiosk mode"
            description={`Enter the lock PIN for ${session.name || 'this device'} to open the time clock.`}
            submitLabel="Enter kiosk"
            onSuccess={() => void enterKioskMode()}
            onCancel={() => setLockedView('idle')}
          />
        );
      }

      if (lockedView === 'idle') {
        return (
          <KioskIdleScreen
            session={session}
            showDashboardLink={canLeaveToDashboard}
            onEnterKiosk={() => setLockedView('enter-pin')}
            onGoToDashboard={() => router.push(dashboardRoute)}
          />
        );
      }

      return (
        <KioskLockedShell session={session} onExitKiosk={handleExitKiosk}>
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
