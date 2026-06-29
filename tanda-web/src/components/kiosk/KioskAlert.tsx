'use client';

import { AlertCircle, X } from 'lucide-react';

interface KioskAlertProps {
  message: string;
  onDismiss?: () => void;
}

/** High-visibility error banner for kiosk screens (tablet / shared device). */
export function KioskAlert({ message, onDismiss }: KioskAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-auto fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[90] mx-auto flex max-w-lg items-start gap-3 rounded-2xl border-2 border-red-400/80 bg-red-950/95 px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:inset-x-6"
    >
      <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-300" aria-hidden />
      <p className="flex-1 text-sm font-semibold leading-snug text-white sm:text-base">
        {message}
      </p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="shrink-0 rounded-lg p-1 text-red-200/80 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
