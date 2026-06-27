'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarClock, Clock, LogOut, Palmtree, X } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import {
  useAdminNotificationBadge,
  useAdminNotifications,
  type AdminNotificationItem,
} from '@/hooks/useAdminNotifications';
import {
  dismissAdminAlertKeys,
  subscribeToDismissedAdminAlertKeys,
} from '@/lib/notifications/admin-notification-preferences';

const ICON_BY_ID: Record<string, typeof Palmtree> = {
  leave_pending: Palmtree,
  missing_checkin: Clock,
  late_today: CalendarClock,
  forgotten_checkout: LogOut,
};

interface AdminNotificationsMenuProps {
  enabled: boolean;
}

export function AdminNotificationsMenu({ enabled }: AdminNotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthRole();
  const userEmail = user?.email ?? '';

  const { items: allItems, totalCount: allCount, loading } = useAdminNotifications(
    enabled && open,
  );

  const visibleItems = allItems.filter((item) => !dismissedKeys.includes(item.id));
  const visibleCount = visibleItems.reduce((sum, item) => sum + item.count, 0);

  const badgeCount = useAdminNotificationBadge(enabled && !open, dismissedKeys);
  const displayCount = open ? visibleCount : badgeCount;

  useEffect(() => {
    if (!enabled || !userEmail) {
      setDismissedKeys([]);
      return;
    }

    return subscribeToDismissedAdminAlertKeys(userEmail, setDismissedKeys);
  }, [enabled, userEmail]);

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

  async function handleDismissItem(itemId: string) {
    if (!userEmail) return;
    await dismissAdminAlertKeys(userEmail, [itemId]);
  }

  async function handleClearAll() {
    if (!userEmail || visibleItems.length === 0) return;
    await dismissAdminAlertKeys(
      userEmail,
      visibleItems.map((item) => item.id),
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
        {displayCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950 md:ring-[#0a0a0a]">
            {displayCount > 9 ? '9+' : displayCount}
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
                    : displayCount === 0
                      ? 'No alerts right now'
                      : `${displayCount} alert${displayCount === 1 ? '' : 's'}`}
                </p>
              </div>
              {visibleItems.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleClearAll()}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover/60 hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-subtle">Loading…</p>
          ) : visibleItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-subtle">
              You are all caught up.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {visibleItems.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
                  onDismiss={() => void handleDismissItem(item.id)}
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
  const Icon = ICON_BY_ID[item.id] ?? Bell;

  return (
    <li className="group flex items-stretch">
      <Link
        href={item.href}
        role="menuitem"
        onClick={onNavigate}
        className="flex min-w-0 flex-1 gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
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
