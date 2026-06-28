'use client';

import { Lock, MonitorSmartphone } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

interface KioskIdleScreenProps {
  session: KioskDeviceSession;
  showDashboardLink: boolean;
  onEnterKiosk: () => void;
  onGoToDashboard: () => void;
}

export function KioskIdleScreen({
  session,
  showDashboardLink,
  onEnterKiosk,
  onGoToDashboard,
}: KioskIdleScreenProps) {
  const warehouse =
    session.locationName && session.locationCity
      ? `${session.locationName} (${session.locationCity})`
      : session.locationName || 'Assigned warehouse';

  return (
    <div className="kiosk-ambient flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10 text-center text-white">
      <CompanyLogo variant="light" className="h-auto w-40 object-contain opacity-90" />
      <div className="mt-6 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md">
        <MonitorSmartphone className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-lg font-semibold">{session.name}</h1>
        <p className="mt-1 text-sm text-zinc-400">{warehouse}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Kiosk mode is paused. Enter your lock PIN to open the time clock in fullscreen.
        </p>

        <button
          type="button"
          onClick={onEnterKiosk}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Lock className="h-4 w-4" />
          Enter kiosk mode
        </button>

        {showDashboardLink ? (
          <button
            type="button"
            onClick={onGoToDashboard}
            className="mt-3 w-full text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Back to dashboard
          </button>
        ) : null}
      </div>
    </div>
  );
}
