'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, MonitorSmartphone, X } from 'lucide-react';
import { CompanyLogo } from '@/components/ui/CompanyLogo';
import { auth } from '@/lib/firebase';
import {
  collectKioskDeviceDetails,
  suggestKioskDeviceName,
} from '@/lib/kiosk/device-details';
import { ensureKioskClientSessionId, ensureKioskDeviceToken, getKioskDeviceToken } from '@/lib/kiosk/device-token';
import { enterKioskFullscreen } from '@/lib/pwa/kiosk-display';
import { subscribeLocations } from '@/lib/locations/locations-service';
import type { KioskDeviceDetails, KioskDeviceSession } from '@/lib/types/kiosk-device';
import type { Location } from '@/lib/types/location';

interface KioskActivationProps {
  defaultMode: 'tablet' | 'mobile';
  defaultLocationId: string;
  defaultName: string;
  onActivated: (session: KioskDeviceSession) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function KioskActivation({
  defaultMode,
  defaultLocationId,
  defaultName,
  onActivated,
  onCancel,
  cancelLabel = 'Cancel',
}: KioskActivationProps) {
  const [mode, setMode] = useState<'tablet' | 'mobile'>(defaultMode);
  const isTablet = mode === 'tablet';
  const [locations, setLocations] = useState<Location[]>([]);
  const [details, setDetails] = useState<KioskDeviceDetails>({});
  const [name, setName] = useState(defaultName);
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [lockPin, setLockPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeLocations(setLocations);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void collectKioskDeviceDetails().then((collected) => {
      if (cancelled) return;
      setDetails(collected);
      setName((current) => current.trim() || suggestKioskDeviceName(collected));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeLocations = useMemo(
    () => locations.filter((location) => location.active),
    [locations],
  );

  async function handleSubmit() {
    setError('');

    if (!name.trim()) {
      setError('Give this device a name.');
      return;
    }
    if (!locationId) {
      setError('Select the warehouse for this device.');
      return;
    }
    if (isTablet) {
      if (!/^\d{4,8}$/.test(lockPin)) {
        setError('Set a 4 to 8 digit lock PIN.');
        return;
      }
      if (lockPin !== confirmPin) {
        setError('The lock PINs do not match.');
        return;
      }
    }

    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setError('Your session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);

    // Request fullscreen during the user gesture (tablets only).
    if (isTablet) {
      void enterKioskFullscreen();
    }

    try {
      const deviceToken = ensureKioskDeviceToken();
      const clientSessionId = ensureKioskClientSessionId();
      const idToken = await currentUser.getIdToken();

      const response = await fetch('/api/kiosk/devices/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-Kiosk-Device-Token': getKioskDeviceToken(),
          'X-Kiosk-Client-Session': clientSessionId,
        },
        body: JSON.stringify({
          deviceToken,
          clientSessionId,
          type: mode,
          name: name.trim(),
          locationId,
          lockPin: isTablet ? lockPin : undefined,
          details,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { session?: KioskDeviceSession; error?: string }
        | null;

      if (!response.ok || !data?.session) {
        throw new Error(data?.error ?? 'Could not activate this device.');
      }

      onActivated(data.session);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not activate this device.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="kiosk-ambient flex min-h-[100dvh] items-center justify-center px-4 py-8 text-white">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-md">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {cancelLabel}
          </button>
        ) : null}

        <div className="flex flex-col items-center text-center">
          <CompanyLogo variant="light" className="h-auto w-40 object-contain" />
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {isTablet ? <Lock className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />}
            {isTablet ? 'Set up shared kiosk tablet' : 'Set up kiosk on this device'}
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            {isTablet
              ? 'This device will run in locked kiosk mode. A PIN will be required to exit.'
              : 'Confirm the warehouse and a name to start clocking in from this device.'}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode('tablet')}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition disabled:opacity-60 ${
              isTablet
                ? 'border-primary bg-primary/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span className="text-xs font-semibold">Shared tablet</span>
            <span className="text-[10px] leading-tight opacity-80">Locked · PIN to exit</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode('mobile')}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition disabled:opacity-60 ${
              !isTablet
                ? 'border-primary bg-primary/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
            }`}
          >
            <MonitorSmartphone className="h-4 w-4" />
            <span className="text-xs font-semibold">This device</span>
            <span className="text-[10px] leading-tight opacity-80">No lock · personal</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="kiosk-name" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Device name
            </label>
            <input
              id="kiosk-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={submitting}
              placeholder="e.g. Warehouse front desk"
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="kiosk-location" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Warehouse
            </label>
            <select
              id="kiosk-location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            >
              <option value="" className="bg-zinc-900">
                Select warehouse…
              </option>
              {activeLocations.map((location) => (
                <option key={location.id} value={location.id} className="bg-zinc-900">
                  {location.city ? `${location.name} (${location.city})` : location.name}
                </option>
              ))}
            </select>
          </div>

          {isTablet ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="kiosk-pin" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Lock PIN
                </label>
                <input
                  id="kiosk-pin"
                  inputMode="numeric"
                  type="password"
                  autoComplete="off"
                  value={lockPin}
                  maxLength={8}
                  onChange={(event) => setLockPin(event.target.value.replace(/\D/g, ''))}
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm tracking-widest text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="kiosk-pin-confirm" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Confirm PIN
                </label>
                <input
                  id="kiosk-pin-confirm"
                  inputMode="numeric"
                  type="password"
                  autoComplete="off"
                  value={confirmPin}
                  maxLength={8}
                  onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ''))}
                  disabled={submitting}
                  className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm tracking-widest text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              className="rounded-xl border-2 border-red-400/70 bg-red-950/80 px-3 py-2.5 text-center text-sm font-semibold text-red-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {submitting ? 'Activating…' : isTablet ? 'Activate kiosk mode' : 'Start kiosk'}
          </button>

          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="w-full text-center text-xs text-zinc-500 transition hover:text-zinc-300 disabled:opacity-60"
            >
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
