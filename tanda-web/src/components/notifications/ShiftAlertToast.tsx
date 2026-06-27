'use client';

import Link from 'next/link';
import { CalendarClock, CalendarX, X } from 'lucide-react';
import type { AppNotification } from '@/lib/types/notification';

interface ShiftAlertToastProps {
  notification: AppNotification | null;
  onDismiss: () => void;
}

export function ShiftAlertToast({ notification, onDismiss }: ShiftAlertToastProps) {
  if (!notification) return null;

  const Icon = notification.type === 'shift_cancelled' ? CalendarX : CalendarClock;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-sm flex-col gap-2"
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{notification.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-400">{notification.body}</p>
            <Link
              href={notification.href}
              onClick={onDismiss}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              View schedule
            </Link>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
