'use client';

import { useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import { KioskScreen } from '@/components/kiosk/KioskScreen';
import {
  getOrCreateKioskDeviceToken,
  kioskDeviceHeaders,
} from '@/lib/kiosk/device-token';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

type DeviceStatus = 'checking' | 'pending' | 'active' | 'revoked' | 'error';

const POLL_INTERVAL_MS = 5000;

export function KioskAuthGuard() {
  const [status, setStatus] = useState<DeviceStatus>('checking');
  const [session, setSession] = useState<KioskDeviceSession | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const refreshStatus = useCallback(async () => {
    const response = await fetch('/api/kiosk/devices/status', {
      headers: kioskDeviceHeaders(),
    });

    if (!response.ok) {
      throw new Error('Could not refresh device status.');
    }

    const data = (await response.json()) as { session: KioskDeviceSession };
    setSession(data.session);

    if (data.session.status === 'active' && data.session.locationId) {
      setStatus('active');
      return;
    }
    if (data.session.status === 'revoked') {
      setStatus('revoked');
      return;
    }
    setStatus('pending');
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const deviceToken = getOrCreateKioskDeviceToken();
        const registerResponse = await fetch('/api/kiosk/devices/register', {
          method: 'POST',
          headers: kioskDeviceHeaders(),
          body: JSON.stringify({
            deviceToken,
            userAgent: navigator.userAgent,
            platform: 'web',
          }),
        });

        if (!registerResponse.ok) {
          throw new Error('Could not register this device.');
        }

        if (cancelled) return;
        await refreshStatus();
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not connect this kiosk.',
        );
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refreshStatus]);

  useEffect(() => {
    if (status !== 'pending') return;

    const intervalId = window.setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshStatus, status]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-400">Connecting kiosk…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-6 text-center">
        <p className="text-sm text-red-400">{errorMessage}</p>
      </div>
    );
  }

  if (status === 'revoked') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <MonitorSmartphone className="mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-lg font-semibold text-white">Access revoked</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          This kiosk was disabled by an administrator. Contact support to restore access.
        </p>
      </div>
    );
  }

  if (status === 'pending' && session) {
    return <KioskPendingApproval shortCode={session.shortCode} />;
  }

  if (status === 'active' && session) {
    return <KioskScreen deviceSession={session} />;
  }

  return null;
}

function KioskPendingApproval({ shortCode }: { shortCode: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <MonitorSmartphone className="mb-4 h-10 w-10 text-primary" />
      <h1 className="text-lg font-semibold text-white">Waiting for administrator approval</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        An admin must approve this tablet and assign a warehouse in Settings → Kiosk devices.
      </p>
      <p className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
        Device code: <span className="font-mono text-lg font-bold text-white">{shortCode}</span>
      </p>
      <p className="mt-4 text-xs text-zinc-500">This screen updates automatically.</p>
    </div>
  );
}
