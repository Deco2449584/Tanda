'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

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
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-primary/30 bg-primary-muted text-primary',
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
      className={cn(
        'fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-sm',
        variantStyles[variant],
      )}
    >
      <p className="flex-1 text-sm font-medium">{toast.text}</p>
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
