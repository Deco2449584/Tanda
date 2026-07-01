'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEmployeeShiftNotifications } from '@/providers/EmployeeShiftNotificationsProvider';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { hasAttentionRequiredNotifications } from '@/lib/notifications/notification-attention';
import { getEmployeeNotificationVisual } from '@/lib/notifications/notification-visuals';
import type { AppNotification } from '@/lib/types/notification';

export function EmployeeNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    clearAll,
  } = useEmployeeShiftNotifications();
  const { settings } = useCompanySettings();
  const {
    supported: pushSupported,
    subscribed: pushSubscribed,
    loading: pushLoading,
    busy: pushBusy,
    permission: pushPermission,
    error: pushError,
    enable: enablePush,
  } = usePushNotifications();

  const systemPushEnabled = settings.pushNotificationsEnabled !== false;
  const showPushPrompt =
    open &&
    pushSupported &&
    systemPushEnabled &&
    !pushLoading &&
    !pushSubscribed;

  const hasProtectedNotifications = hasAttentionRequiredNotifications(notifications);
  const clearableCount = notifications.filter(
    (notification) =>
      notification.type !== 'justification_required' && notification.type !== 'no_show',
  ).length;

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
                    ? 'No updates yet'
                    : `${notifications.length} update${notifications.length === 1 ? '' : 's'}`}
                </p>
              </div>
              {clearableCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  title={
                    hasProtectedNotifications
                      ? 'Attendance items requiring action will stay in your tray'
                      : undefined
                  }
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              ) : hasProtectedNotifications ? (
                <span className="shrink-0 text-[10px] text-subtle">Action required</span>
              ) : null}
            </div>
          </div>

          {showPushPrompt ? (
            <div className="border-b border-border bg-surface-base/60 px-4 py-3">
              <p className="text-xs text-muted">
                {pushPermission === 'denied'
                  ? 'Browser notifications are blocked. Enable them in your device settings to get shift alerts.'
                  : 'Turn on push notifications to receive shift updates on this device.'}
              </p>
              {pushPermission !== 'denied' ? (
                <button
                  type="button"
                  onClick={() => void enablePush()}
                  disabled={pushBusy}
                  className="mt-2 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {pushBusy ? 'Enabling…' : 'Enable notifications'}
                </button>
              ) : null}
              {pushError ? (
                <p className="mt-2 text-[11px] text-red-400">{pushError}</p>
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
  const { icon: Icon, badgeClass } = getEmployeeNotificationVisual(notification.type);

  return (
    <li>
      <Link
        href={notification.href}
        role="menuitem"
        onClick={onNavigate}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${badgeClass}`}>
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
