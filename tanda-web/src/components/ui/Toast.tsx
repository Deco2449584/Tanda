'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  variant?: 'success' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ toast, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [toast, durationMs, onDismiss]);

  if (!toast) return null;

  const isSuccess = toast.variant !== 'info';

  return (
    <div
      role="status"
      className={`fixed bottom-6 right-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-xl md:right-6 ${
        isSuccess
          ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-100'
          : 'border-zinc-700 bg-zinc-900 text-zinc-100'
      }`}
    >
      <p className="flex-1 text-sm">{toast.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-current opacity-70 hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
