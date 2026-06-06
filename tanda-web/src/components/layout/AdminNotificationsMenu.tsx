'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarClock, Clock, LogOut, Palmtree } from 'lucide-react';
import {
  useAdminNotificationBadge,
  useAdminNotifications,
  type AdminNotificationItem,
} from '@/hooks/useAdminNotifications';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { items, totalCount, loading } = useAdminNotifications(enabled && open);
  const badgeCount = useAdminNotificationBadge(enabled && !open);
  const displayCount = open ? totalCount : badgeCount;

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

  if (!enabled) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
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
          className="absolute right-0 top-full z-[100] mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl"
        >
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {loading
                ? 'Updating…'
                : displayCount === 0
                  ? 'No alerts right now'
                  : `${displayCount} alert${displayCount === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              You are all caught up.
            </p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onNavigate={() => setOpen(false)}
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
}: {
  item: AdminNotificationItem;
  onNavigate: () => void;
}) {
  const Icon = ICON_BY_ID[item.id] ?? Bell;

  return (
    <li>
      <Link
        href={item.href}
        role="menuitem"
        onClick={onNavigate}
        className="flex gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-zinc-100">{item.title}</span>
            <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {item.count}
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-500">
            {item.description}
          </span>
        </span>
      </Link>
    </li>
  );
}
