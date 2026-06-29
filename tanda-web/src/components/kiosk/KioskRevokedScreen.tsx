'use client';

import { useState } from 'react';
import { Loader2, ShieldOff } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { KioskSignOutButton } from '@/components/kiosk/KioskSignOutButton';
import { auth } from '@/lib/firebase';
import { kioskDeviceHeaders } from '@/lib/kiosk/device-token';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

interface KioskRevokedScreenProps {
  session: KioskDeviceSession;
  onRerequested: (session: KioskDeviceSession) => void;
  onGoToDashboard?: () => void;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
}

export function KioskRevokedScreen({
  session,
  onRerequested,
  onGoToDashboard,
  onSignOut,
  signingOut = false,
}: KioskRevokedScreenProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const locationLabel = [session.locationName, session.locationCity].filter(Boolean).join(' · ');

  async function handleRerequest() {
    setError('');
    setSubmitting(true);

    try {
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('Your session expired. Please sign in again.');
      }

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/kiosk/devices/rerequest', {
        method: 'POST',
        headers: {
          ...kioskDeviceHeaders(),
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ deviceId: session.deviceId }),
      });

      const data = (await response.json().catch(() => null)) as
        | { session?: KioskDeviceSession; error?: string }
        | null;

      if (!response.ok || !data?.session) {
        throw new Error(data?.error ?? 'Could not submit the request.');
      }

      onRerequested(data.session);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Could not submit the request.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="kiosk-ambient flex min-h-[100dvh] items-center justify-center px-4 py-8 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-md">
        <CompanyLogo variant="light" className="mx-auto h-auto w-40 object-contain" />
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
          <ShieldOff className="h-3.5 w-3.5" />
          Access revoked
        </div>
        <h1 className="mt-4 text-lg font-semibold">This connection was revoked</h1>
        <p className="mt-2 text-sm text-zinc-400">
          An administrator revoked kiosk access for this browser tab. Request approval again to
          reconnect from this same tab.
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

        {error ? (
          <p
            className="mt-4 rounded-xl border-2 border-red-400/70 bg-red-950/80 px-3 py-2.5 text-center text-sm font-semibold text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleRerequest()}
          disabled={submitting}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          {submitting ? 'Submitting…' : 'Request approval again'}
        </button>

        {onGoToDashboard ? (
          <button
            type="button"
            onClick={onGoToDashboard}
            disabled={submitting}
            className="mt-3 w-full text-center text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-60"
          >
            Back to dashboard
          </button>
        ) : null}
        {onSignOut ? (
          <KioskSignOutButton
            onSignOut={onSignOut}
            signingOut={signingOut}
            variant="prominent"
          />
        ) : null}
      </div>
    </div>
  );
}
