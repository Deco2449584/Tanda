'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function ShiftNotificationsPrompt() {
  const {
    supported,
    permission,
    subscribed,
    loading,
    busy,
    error,
    enable,
    disable,
  } = usePushNotifications();

  if (!supported || loading) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
        <div className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          <p>
            Notifications are blocked in your browser. Enable them in site settings
            to get alerts when your schedule changes.
          </p>
        </div>
      </div>
    );
  }

  if (subscribed) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm text-emerald-200">
          <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Shift notifications are enabled. You will be alerted for new or cancelled shifts.</p>
        </div>
        <button
          type="button"
          onClick={() => void disable()}
          disabled={busy}
          className="shrink-0 rounded-lg border border-emerald-800 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-950/40 disabled:opacity-60"
        >
          {busy ? 'Updating…' : 'Turn off'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-[#001A3F]/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 text-sm text-zinc-200">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p>Get notified when a shift is assigned or cancelled on your schedule.</p>
      </div>
      <button
        type="button"
        onClick={() => void enable()}
        disabled={busy}
        className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? 'Enabling…' : 'Enable notifications'}
      </button>
      {error ? (
        <p className="text-xs text-red-400 sm:basis-full" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
