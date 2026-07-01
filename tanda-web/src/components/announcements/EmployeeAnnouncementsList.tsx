'use client';

import { useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Announcement } from '@/lib/types/announcement';

function formatAnnouncementDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function announcementElementId(id: string): string {
  return `announcement-${id}`;
}

interface EmployeeAnnouncementsListProps {
  announcements: Announcement[];
  loading?: boolean;
  highlightId?: string | null;
}

export function EmployeeAnnouncementsList({
  announcements,
  loading,
  highlightId = null,
}: EmployeeAnnouncementsListProps) {
  useEffect(() => {
    if (!highlightId || loading) return;

    const element = document.getElementById(announcementElementId(highlightId));
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightId, loading, announcements.length]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-muted">
        Loading announcements…
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        No company announcements for your profile yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {announcements.map((announcement) => {
        const isHighlighted = highlightId === announcement.id;

        return (
          <li
            key={announcement.id}
            id={announcementElementId(announcement.id)}
            className={cn(
              'scroll-mt-24 rounded-2xl border border-border bg-surface-raised p-4 md:p-5',
              isHighlighted && 'ring-2 ring-primary/40',
            )}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
                <Megaphone className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">
                  {announcement.title}
                </h2>
                <p className="mt-1 text-xs text-subtle">
                  {formatAnnouncementDate(announcement.createdAt)}
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {announcement.body}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function parseAnnouncementHash(hash: string): string | null {
  const value = hash.replace(/^#/, '').trim();
  if (!value.startsWith('announcement-')) return null;
  const id = value.slice('announcement-'.length);
  return id || null;
}
