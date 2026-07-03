'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  useAdminNotifications,
  type AdminNotificationItem,
} from '@/hooks/useAdminNotifications';
import {
  dismissAdminAlerts,
  subscribeToDismissedAdminAlerts,
} from '@/lib/notifications/admin-notification-preferences';
import { isInformationalAdminAlert } from '@/lib/notifications/admin-alert-metadata';
import { filterAdminNotificationsByChannels } from '@/lib/notifications/admin-alert-channels';
import {
  computeAdminBadgeCount,
  filterVisibleAdminAlerts,
  type DismissedAdminAlertsMap,
} from '@/lib/notifications/admin-notification-dismiss';
import {
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import { subscribeToNotificationChannels } from '@/lib/notifications/employee-notification-preferences';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';

import { getAdminAlertVisual } from '@/lib/notifications/notification-visuals';

interface AdminNotificationsMenuProps {
  enabled: boolean;
}

export function AdminNotificationsMenu({ enabled }: AdminNotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<DismissedAdminAlertsMap>({});
  const [channels, setChannels] = useState<NotificationChannelPreferences>(
    mapNotificationChannels(null),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const informationalDismissedForOpenRef = useRef(false);
  const { user } = useAuthRole();
  const userEmail = user?.email ?? '';

  const { items: allItems, loading, timeZone } = useAdminNotifications(enabled);
  const todayKey = toInputDateInTimeZone(timeZone);

  const channelFilteredItems = useMemo(
    () => filterAdminNotificationsByChannels(allItems, channels),
    [allItems, channels],
  );

  const visibleItems = useMemo(
    () => filterVisibleAdminAlerts(channelFilteredItems, dismissedAlerts, todayKey),
    [channelFilteredItems, dismissedAlerts, todayKey],
  );

  const actionableItems = useMemo(
    () => visibleItems.filter((item) => item.requiresAction),
    [visibleItems],
  );
  const informationalItems = useMemo(
    () => visibleItems.filter((item) => !item.requiresAction),
    [visibleItems],
  );
  const hasActionableItems = actionableItems.length > 0;
  const badgeCount = computeAdminBadgeCount(visibleItems);
  const actionableBadgeCount = computeAdminBadgeCount(actionableItems);

  useEffect(() => {
    if (!enabled || !userEmail) {
      setDismissedAlerts({});
      setChannels(mapNotificationChannels(null));
      return;
    }

    const unsubscribeDismissed = subscribeToDismissedAdminAlerts(
      userEmail,
      todayKey,
      setDismissedAlerts,
    );
    const unsubscribeChannels = subscribeToNotificationChannels(userEmail, setChannels);

    return () => {
      unsubscribeDismissed();
      unsubscribeChannels();
    };
  }, [enabled, todayKey, userEmail]);

  useEffect(() => {
    if (!open) {
      informationalDismissedForOpenRef.current = false;
      return;
    }

    if (!userEmail || loading || informationalDismissedForOpenRef.current) {
      return;
    }

    if (informationalItems.length === 0) {
      informationalDismissedForOpenRef.current = true;
      return;
    }

    informationalDismissedForOpenRef.current = true;
    void dismissAdminAlerts(
      userEmail,
      informationalItems.map((item) => ({
        id: item.id,
        count: item.count,
        dateKey: todayKey,
      })),
    );
  }, [informationalItems, loading, open, todayKey, userEmail]);

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
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleDismissItem(item: AdminNotificationItem) {
    if (!userEmail || isInformationalAdminAlert(item.id)) return;

    await dismissAdminAlerts(userEmail, [
      {
        id: item.id,
        count: item.count,
      },
    ]);
  }

  async function handleClearActionable() {
    if (!userEmail || actionableItems.length === 0) return;

    await dismissAdminAlerts(
      userEmail,
      actionableItems.map((item) => ({
        id: item.id,
        count: item.count,
      })),
    );
  }

  if (!enabled) return null;

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
        {badgeCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950 md:ring-[#0a0a0a]">
            {badgeCount > 9 ? '9+' : badgeCount}
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
                  {loading
                    ? 'Updating…'
                    : hasActionableItems
                      ? `${actionableBadgeCount} need${actionableBadgeCount === 1 ? 's' : ''} action`
                      : badgeCount > 0
                        ? `${badgeCount} informational alert${badgeCount === 1 ? '' : 's'}`
                        : 'No alerts right now'}
                </p>
              </div>
              {hasActionableItems ? (
                <button
                  type="button"
                  onClick={() => void handleClearActionable()}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground"
                  title="Dismiss action items you have already handled"
                >
                  Clear
                </button>
              ) : !loading ? (
                <span className="shrink-0 text-[10px] text-subtle">All caught up</span>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-subtle">Loading…</p>
          ) : !hasActionableItems ? (
            <p className="px-4 py-6 text-center text-sm text-subtle">
              Nothing needs your action right now.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto bg-surface-raised py-1 pr-1 scrollbar-thin">
              {actionableItems.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
                  onDismiss={() => void handleDismissItem(item)}
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
  item,
  onNavigate,
  onDismiss,
}: {
  item: AdminNotificationItem;
  onNavigate: () => void;
  onDismiss: () => void;
}) {
  const { icon: Icon, badgeClass } = getAdminAlertVisual(item.id);

  return (
    <li className="group flex items-stretch">
      <Link
        href={item.href}
        role="menuitem"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${badgeClass}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground">{item.title}</span>
            <span className="shrink-0 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold text-muted">
              {item.count}
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-subtle">
            {item.description}
          </span>
          {item.details.length > 0 ? (
            <span className="mt-1.5 block space-y-0.5">
              {item.details.map((line) => (
                <span
                  key={line}
                  className="block truncate text-[11px] leading-snug text-muted"
                >
                  {line}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 px-3 text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        aria-label={`Dismiss ${item.title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
