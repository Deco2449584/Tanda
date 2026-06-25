'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Lock, X } from 'lucide-react';
import { KioskMasterPinPad } from '@/components/kiosk/KioskMasterPinPad';
import { useKioskFullscreenOnInteraction } from '@/hooks/useKioskFullscreen';
import { kioskDeviceHeaders } from '@/lib/kiosk/device-token';
import type { KioskDeviceSession } from '@/lib/types/kiosk-device';

interface KioskLockedShellProps {
  session: KioskDeviceSession;
  onExit: () => void | Promise<void>;
  children: ReactNode;
}

export function KioskLockedShell({ session, onExit, children }: KioskLockedShellProps) {
  useKioskFullscreenOnInteraction();

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const closeUnlock = useCallback(() => {
    setUnlockOpen(false);
    setPin('');
    setError('');
  }, []);

  const handleVerify = useCallback(async () => {
    if (!pin) return;
    setVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/kiosk/devices/unlock', {
        method: 'POST',
        headers: kioskDeviceHeaders(),
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        setError('Incorrect PIN.');
        setPin('');
        return;
      }

      await onExit();
    } catch {
      setError('Could not verify the PIN. Try again.');
    } finally {
      setVerifying(false);
    }
  }, [pin, onExit]);

  return (
    <div className="relative h-[100dvh] w-full">
      {children}

      <button
        type="button"
        onClick={() => setUnlockOpen(true)}
        aria-label="Exit kiosk mode"
        className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[70] flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-zinc-400 backdrop-blur transition hover:text-white"
      >
        <Lock className="h-4 w-4" />
      </button>

      {unlockOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/90 px-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900/90 p-6 text-center shadow-2xl">
            <button
              type="button"
              onClick={closeUnlock}
              aria-label="Cancel"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <Lock className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-3 text-lg font-semibold text-white">Exit kiosk mode</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter the lock PIN for {session.name || 'this device'} to exit.
            </p>

            <div className="mt-5 flex justify-center">
              <KioskMasterPinPad
                pin={pin}
                loading={verifying}
                submitLabel="Unlock"
                onDigit={(digit) => setPin((prev) => (prev.length >= 8 ? prev : prev + digit))}
                onBackspace={() => setPin((prev) => prev.slice(0, -1))}
                onClear={() => setPin('')}
                onSubmit={() => void handleVerify()}
              />
            </div>

            {error ? (
              <p className="mt-3 text-xs text-red-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
