'use client';

import { useCallback, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { KioskMasterPinPad } from '@/components/kiosk/KioskMasterPinPad';
import { kioskDeviceHeaders } from '@/lib/kiosk/device-token';

interface KioskPinGateProps {
  title: string;
  description: string;
  submitLabel?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function KioskPinGate({
  title,
  description,
  submitLabel = 'Confirm',
  onSuccess,
  onCancel,
}: KioskPinGateProps) {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

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

      setPin('');
      onSuccess();
    } catch {
      setError('Could not verify the PIN. Try again.');
    } finally {
      setVerifying(false);
    }
  }, [pin, onSuccess]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[radial-gradient(125%_85%_at_50%_-10%,#13224a_0%,#0a1020_42%,#05070d_100%)] px-4 py-10 text-white">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl backdrop-blur-md">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}

        <Lock className="mx-auto h-8 w-8 text-primary" />
        <h1 className="mt-3 text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{description}</p>

        <div className="mt-5 flex justify-center">
          <KioskMasterPinPad
            pin={pin}
            loading={verifying}
            submitLabel={submitLabel}
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
  );
}
