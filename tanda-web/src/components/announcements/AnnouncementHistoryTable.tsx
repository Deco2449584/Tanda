'use client';

import Link from 'next/link';
import type { Announcement } from '@/lib/types/announcement';

function formatAudienceLabel(announcement: Announcement): string {
  if (announcement.audience === 'department') {
    return announcement.audienceValue
      ? `Department: ${announcement.audienceValue}`
      : 'Department';
  }
  if (announcement.audience === 'location') {
    return announcement.audienceValue ? `Location filter` : 'Location';
  }
  return 'All employees';
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

interface AnnouncementHistoryTableProps {
  announcements: Announcement[];
  loading?: boolean;
}

export function AnnouncementHistoryTable({
  announcements,
  loading = false,
}: AnnouncementHistoryTableProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <p className="text-sm text-subtle">Loading history…</p>
      </section>
    );
  }

  if (announcements.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-white">Sent announcements</h2>
        <p className="mt-2 text-sm text-subtle">No announcements have been sent yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <h2 className="text-sm font-semibold text-white">Sent announcements</h2>
      <p className="mt-1 text-xs text-subtle">
        Delivery stats for email, in-app notifications, and push.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-2 font-semibold">Subject</th>
              <th className="px-3 py-2 font-semibold">Audience</th>
              <th className="px-3 py-2 font-semibold">Delivered</th>
              <th className="px-3 py-2 font-semibold">Sent</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {announcements.map((announcement) => (
              <tr key={announcement.id} className="border-b border-border/70">
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-foreground">{announcement.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-subtle">{announcement.body}</p>
                </td>
                <td className="px-3 py-3 align-top text-subtle">
                  {formatAudienceLabel(announcement)}
                </td>
                <td className="px-3 py-3 align-top text-subtle">
                  <p>{announcement.recipientCount} recipients</p>
                  <p className="mt-1 text-xs">
                    {announcement.notificationCount} in-app · {announcement.emailSentCount}{' '}
                    email · {announcement.pushSentCount} push
                  </p>
                </td>
                <td className="px-3 py-3 align-top text-subtle">
                  {formatDate(announcement.createdAt)}
                </td>
                <td className="px-3 py-3 align-top">
                  <Link
                    href={`/announcements/${announcement.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
