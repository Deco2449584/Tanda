'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarClock, CalendarX } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEmployeeShiftNotifications } from '@/providers/EmployeeShiftNotificationsProvider';
import type { AppNotification } from '@/lib/types/notification';

export function EmployeeNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, markRead, clearAll } =
    useEmployeeShiftNotifications();
  const {
    supported: pushSupported,
    subscribed: pushSubscribed,
    busy: pushBusy,
    error: pushError,
    enable: enablePush,
    disable: disablePush,
  } = usePushNotifications();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      markAllRead();
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [markAllRead, open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950 md:ring-[#0a0a0a]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : pushSupported && !pushSubscribed ? (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-zinc-950 md:ring-[#0a0a0a]" />
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[100] mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {notifications.length === 0
                    ? 'No schedule updates yet'
                    : `${notifications.length} update${notifications.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {pushSupported ? (
            <div className="border-b border-border px-4 py-3">
              {pushSubscribed ? (
                <>
                  <p className="text-xs text-muted">
                    Phone alerts are enabled for schedule changes on this device.
                  </p>
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={() => void disablePush()}
                    className="mt-2 rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-60"
                  >
                    {pushBusy ? 'Updating…' : 'Disable phone alerts'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted">
                    Enable phone alerts to get notified when your schedule changes.
                  </p>
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={() => void enablePush()}
                    className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {pushBusy ? 'Enabling…' : 'Enable phone alerts'}
                  </button>
                </>
              )}
              {pushError ? (
                <p className="mt-2 text-xs text-red-400" role="alert">
                  {pushError}
                </p>
              ) : null}
            </div>
          ) : null}

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-subtle">
              You are all caught up.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onNavigate={() => {
                    markRead(notification.id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate: () => void;
}) {
  const Icon =
    notification.type === 'shift_cancelled' ? CalendarX : CalendarClock;

  return (
    <li>
      <Link
        href={notification.href}
        role="menuitem"
        onClick={onNavigate}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {notification.title}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-subtle">
            {notification.body}
          </span>
        </span>
        {!notification.read ? (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
        ) : null}
      </Link>
    </li>
  );
}
