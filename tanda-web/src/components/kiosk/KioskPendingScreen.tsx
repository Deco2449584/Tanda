'use client';

import { Clock } from 'lucide-react';
import { KioskSignOutButton } from '@/components/kiosk/KioskSignOutButton';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

interface KioskPendingScreenProps {
  session: KioskDeviceSession;
  onGoToDashboard?: () => void;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
}

export function KioskPendingScreen({
  session,
  onGoToDashboard,
  onSignOut,
  signingOut = false,
}: KioskPendingScreenProps) {
  const locationLabel = [session.locationName, session.locationCity].filter(Boolean).join(' · ');

  return (
    <div className="kiosk-ambient flex min-h-[100dvh] items-center justify-center px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-md">
        <CompanyLogo variant="light" className="mx-auto h-auto w-40 object-contain" />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          Waiting for admin approval
        </div>
        <h1 className="mt-4 text-lg font-semibold">Kiosk request submitted</h1>
        <p className="mt-2 text-sm text-zinc-400">
          An administrator must approve this device before you can clock in. You can leave this
          page open — it will connect automatically once approved.
        </p>
        <dl className="mt-5 space-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm">
          <div>
            <dt className="text-xs text-zinc-500">Device</dt>
            <dd className="font-medium text-white">{session.name || 'Unnamed device'}</dd>
          </div>
          {locationLabel ? (
            <div>
              <dt className="text-xs text-zinc-500">Warehouse</dt>
              <dd className="font-medium text-white">{locationLabel}</dd>
            </div>
          ) : null}
        </dl>

        {onGoToDashboard ? (
          <button
            type="button"
            onClick={onGoToDashboard}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-sm font-semibold text-zinc-200 transition hover:bg-white/10 hover:text-white"
          >
            Exit
          </button>
        ) : null}

        {onSignOut ? (
          <KioskSignOutButton
            onSignOut={onSignOut}
            signingOut={signingOut}
            variant="prominent"
            label="Exit"
            signingOutLabel="Exiting…"
          />
        ) : null}
      </div>
    </div>
  );
}
