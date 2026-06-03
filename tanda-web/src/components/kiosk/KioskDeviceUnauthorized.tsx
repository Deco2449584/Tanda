'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { KioskMasterPinPad } from '@/components/kiosk/KioskMasterPinPad';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import {
  isKioskMasterPinConfigured,
  setKioskAuthorized,
  verifyKioskMasterPin,
} from '@/lib/kiosk/device-auth';

interface KioskDeviceUnauthorizedProps {
  onAuthorized: () => void;
}

function createToast(
  text: string,
  variant: ToastMessage['variant'],
): ToastMessage {
  return { id: crypto.randomUUID(), text, variant };
}

export function KioskDeviceUnauthorized({
  onAuthorized,
}: KioskDeviceUnauthorizedProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const pinConfigured = isKioskMasterPinConfigured();

  const handleSubmit = () => {
    if (!pinConfigured) {
      setToast(
        createToast(
          'Kiosk master PIN is not configured on the server.',
          'error',
        ),
      );
      return;
    }

    if (!pin) {
      setToast(createToast('Enter the master admin PIN.', 'error'));
      return;
    }

    if (!verifyKioskMasterPin(pin)) {
      setToast(createToast('Incorrect master PIN.', 'error'));
      setPin('');
      return;
    }

    setLoading(true);
    setKioskAuthorized();
    onAuthorized();
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-[100dvh] max-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-3 py-4 md:px-4 md:py-6">
      <div
        className="pointer-events-none absolute -left-10 -top-20 h-40 w-40 rounded-full bg-blue-600/15 blur-3xl md:h-56 md:w-56"
        aria-hidden
      />

      <div className="flex w-full max-w-md shrink-0 flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/30 bg-blue-950/50 text-blue-400 md:mb-6 md:h-24 md:w-24">
          <Lock className="h-8 w-8 md:h-12 md:w-12" strokeWidth={1.75} />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white md:text-3xl">
          Device Not Authorized
        </h1>
        <p className="mt-2 max-w-sm text-xs text-zinc-400 md:mt-3 md:text-base">
          Enter Master Admin PIN to setup this terminal
        </p>

        {!pinConfigured && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-1.5 text-[10px] text-amber-200 md:mt-4 md:px-4 md:py-2 md:text-xs">
            Set{' '}
            <code className="text-amber-100">NEXT_PUBLIC_KIOSK_MASTER_PIN</code>{' '}
            in <code className="text-amber-100">.env.local</code>
          </p>
        )}

        <div className="mt-4 w-full md:mt-8">
          <KioskMasterPinPad
            pin={pin}
            loading={loading}
            onDigit={(digit) => {
              if (pin.length >= 12) return;
              setPin((prev) => prev + digit);
            }}
            onBackspace={() => setPin((prev) => prev.slice(0, -1))}
            onClear={() => setPin('')}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
