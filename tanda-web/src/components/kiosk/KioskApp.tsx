'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldX } from 'lucide-react';
import { KioskIdleScreen } from '@/components/kiosk/KioskIdleScreen';
import { KioskLocationSelect } from '@/components/kiosk/KioskLocationSelect';
import { KioskScreen } from '@/components/kiosk/KioskScreen';
import { KioskSettingsPanel } from '@/components/kiosk/KioskSettingsPanel';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useSignOut } from '@/hooks/useSignOut';
import { getHomeRouteForRole, isAdminAreaRole } from '@/lib/auth/roles';
import { getKioskAuthHeaders } from '@/lib/kiosk/kiosk-auth-headers';
import {
  resolveStoredKioskLocationId,
  setStoredKioskLocationId,
} from '@/lib/kiosk/active-location';
import {
  clearKioskModeActive,
  isKioskModeActive,
  setKioskModeActive,
} from '@/lib/kiosk/kiosk-lock-state';
import { enterKioskFullscreen, exitKioskFullscreen } from '@/lib/pwa/kiosk-display';
import type { KioskContext } from '@/lib/types/kiosk-context';

type Phase = 'loading' | 'denied' | 'select-location' | 'ready' | 'settings';

function KioskMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk-ambient flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <CompanyLogo variant="horizontal" className="h-auto w-44 object-contain opacity-90" />
      {children}
    </div>
  );
}

function locationLabel(context: KioskContext, locationId: string): string {
  const location = context.allowedLocations.find((item) => item.id === locationId);
  if (!location) return 'Assigned client';
  return location.city ? `${location.name} (${location.city})` : location.name;
}

export function KioskApp() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuthRole();
  const { signOutUser, signingOut } = useSignOut();
  const { employee, loading: employeeLoading } = useCurrentEmployee(user?.email);

  const [phase, setPhase] = useState<Phase>('loading');
  const [context, setContext] = useState<KioskContext | null>(null);
  const [activeLocationId, setActiveLocationId] = useState('');
  const [paused, setPaused] = useState(false);
  const loginRecordedRef = useRef(false);

  const isKioskAccount = role === 'kiosk';
  const hasAccess =
    role === 'kiosk' ||
    isAdminAreaRole(role ?? 'empleado') ||
    employee?.kioskEnabled === true;
  const canLeaveToDashboard = !isKioskAccount;
  const dashboardRoute = getHomeRouteForRole(role ?? 'empleado');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/kiosk');
    }
  }, [authLoading, user, router]);

  const loadContext = useCallback(async () => {
    try {
      const headers = await getKioskAuthHeaders();
      const response = await fetch('/api/kiosk/context', { headers });
      const data = (await response.json().catch(() => null)) as
        | { context?: KioskContext; error?: string }
        | null;

      if (!response.ok || !data?.context) {
        setContext(null);
        setPhase('denied');
        return;
      }

      const next = data.context;
      setContext(next);

      const allowedIds = next.allowedLocations.map((item) => item.id);
      if (allowedIds.length === 0) {
        setActiveLocationId('');
        setPhase('denied');
        return;
      }

      const resolved = resolveStoredKioskLocationId(allowedIds, '');
      if (resolved) {
        setStoredKioskLocationId(resolved);
        setActiveLocationId(resolved);
        setPhase('ready');
        setPaused(isKioskAccount && !isKioskModeActive());
        return;
      }

      if (next.canChangeLocation && allowedIds.length > 1) {
        setPhase('select-location');
        return;
      }

      const fallback = next.defaultLocationId || allowedIds[0]!;
      setStoredKioskLocationId(fallback);
      setActiveLocationId(fallback);
      setPhase('ready');
      setPaused(isKioskAccount && !isKioskModeActive());
    } catch {
      setContext(null);
      setPhase('denied');
    }
  }, [isKioskAccount]);

  useEffect(() => {
    if (authLoading || !user || employeeLoading) return;

    if (!hasAccess) {
      setPhase('denied');
      return;
    }

    void loadContext();
  }, [authLoading, user, employeeLoading, hasAccess, loadContext]);

  useEffect(() => {
    if (phase !== 'ready' || !context || !activeLocationId || loginRecordedRef.current) {
      return;
    }

    loginRecordedRef.current = true;
    void getKioskAuthHeaders()
      .then((headers) =>
        fetch('/api/kiosk/login-history', {
          method: 'POST',
          headers,
          body: JSON.stringify({ locationId: activeLocationId }),
        }),
      )
      .catch(() => undefined);
  }, [phase, context, activeLocationId]);

  const enterKioskMode = useCallback(async () => {
    setKioskModeActive(true);
    setPaused(false);
    await enterKioskFullscreen();
  }, []);

  const pauseKiosk = useCallback(async () => {
    clearKioskModeActive();
    setPaused(true);
    await exitKioskFullscreen();
  }, []);

  const handleLeaveKiosk = useCallback(async () => {
    await pauseKiosk();
    if (canLeaveToDashboard) {
      router.push(dashboardRoute);
    }
  }, [canLeaveToDashboard, dashboardRoute, pauseKiosk, router]);

  const applyLocation = useCallback(
    async (locationId: string, recordChange: boolean) => {
      if (!context) return;
      const allowed = context.allowedLocations.some((item) => item.id === locationId);
      if (!allowed) return;

      if (recordChange) {
        const headers = await getKioskAuthHeaders();
        const response = await fetch('/api/kiosk/active-location', {
          method: 'POST',
          headers,
          body: JSON.stringify({ locationId }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? 'Could not change client.');
        }
      }

      setStoredKioskLocationId(locationId);
      setActiveLocationId(locationId);
      setPhase('ready');
      if (isKioskAccount) {
        await enterKioskMode();
      } else {
        setPaused(false);
      }
    },
    [context, enterKioskMode, isKioskAccount],
  );

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
          Your account is not allowed to use the kiosk, or it has no assigned client.
          Ask an administrator to enable kiosk access and assign a client.
        </p>
        <button
          type="button"
          onClick={() =>
            isKioskAccount ? void signOutUser() : router.push(dashboardRoute)
          }
          className="mt-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {isKioskAccount ? 'Sign out' : 'Go back'}
        </button>
      </KioskMessage>
    );
  }

  if (phase === 'select-location' && context) {
    return (
      <KioskLocationSelect
        locations={context.allowedLocations}
        onSelect={(locationId) => void applyLocation(locationId, true)}
      />
    );
  }

  if (phase === 'settings' && context) {
    return (
      <KioskSettingsPanel
        context={context}
        activeLocationId={activeLocationId}
        onLocationChange={(locationId) => applyLocation(locationId, true)}
        onClose={() => {
          setPhase('ready');
          if (isKioskAccount) {
            setPaused(false);
          }
        }}
      />
    );
  }

  if (phase === 'ready' && context && activeLocationId) {
    if (paused) {
      return (
        <KioskIdleScreen
          name={context.operatorName}
          locationLabel={locationLabel(context, activeLocationId)}
          showDashboardLink={canLeaveToDashboard}
          onEnterKiosk={() => void enterKioskMode()}
          onGoToDashboard={() => router.push(dashboardRoute)}
          onSignOut={isKioskAccount ? () => void signOutUser() : undefined}
          signingOut={signingOut}
        />
      );
    }

    return (
      <KioskScreen
        locationId={activeLocationId}
        locationLabel={locationLabel(context, activeLocationId)}
        onExit={() => void handleLeaveKiosk()}
        onOpenSettings={() => {
          clearKioskModeActive();
          setPhase('settings');
        }}
        exitLabel="Exit"
      />
    );
  }

  return null;
}
