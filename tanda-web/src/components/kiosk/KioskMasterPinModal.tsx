'use client';

import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { KioskMasterPinPad } from '@/components/kiosk/KioskMasterPinPad';
import {
  isKioskMasterPinConfigured,
  verifyKioskMasterPin,
} from '@/lib/kiosk/device-auth';

interface KioskMasterPinModalProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel?: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function KioskMasterPinModal({
  open,
  title,
  description,
  submitLabel = 'Confirm',
  onClose,
  onSuccess,
  onError,
}: KioskMasterPinModalProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!open) setPin('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!isKioskMasterPinConfigured()) {
      onError('Kiosk master PIN is not configured on the server.');
      return;
    }

    if (!pin) {
      onError('Enter the master admin PIN.');
      return;
    }

    if (!verifyKioskMasterPin(pin)) {
      onError('Incorrect master PIN.');
      setPin('');
      return;
    }

    onSuccess();
    setPin('');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-primary/25 bg-zinc-900 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-zinc-500 transition hover:text-zinc-300"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-white">{title}</h2>
            <p className="text-sm text-zinc-400">{description}</p>
          </div>
        </div>

        <KioskMasterPinPad
          pin={pin}
          submitLabel={submitLabel}
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
  );
}
