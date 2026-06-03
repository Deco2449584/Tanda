'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  variant?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

const variantStyles: Record<NonNullable<ToastMessage['variant']>, string> = {
  success: 'border-primary/40 bg-primary/20 text-primary',
  error: 'border-red-500/40 bg-red-950/80 text-red-100',
  info: 'border-primary/40 bg-primary/20 text-primary',
};

export function Toast({ toast, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const variant = toast.variant ?? 'success';

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-sm ${variantStyles[variant]}`}
    >
      <p className="flex-1 text-sm">{toast.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
