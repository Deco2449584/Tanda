'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import type { Announcement } from '@/lib/types/announcement';
import { DeleteAnnouncementConfirmModal } from '@/components/announcements/DeleteAnnouncementConfirmModal';
import { EditAnnouncementModal } from '@/components/announcements/EditAnnouncementModal';
import {
  deleteAnnouncementRequest,
  updateAnnouncementRequest,
} from '@/lib/announcements/announcement-api';

function formatAudienceLabel(announcement: Announcement): string {
  if (announcement.audience === 'department') {
    return announcement.audienceValue
      ? `Department: ${announcement.audienceValue}`
      : 'Department';
  }
  if (announcement.audience === 'location') {
    return announcement.audienceValue ? `Location filter` : 'Location';
  }
  if (announcement.audience === 'selected') {
    const count =
      announcement.recipientEmails?.length ?? announcement.recipientCount ?? 0;
    return `Selected employees (${count})`;
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
  canUpdate?: boolean;
  canDelete?: boolean;
  onChanged?: () => void;
  onError?: (message: string) => void;
}

export function AnnouncementHistoryTable({
  announcements,
  loading = false,
  canUpdate = false,
  canDelete = false,
  onChanged,
  onError,
}: AnnouncementHistoryTableProps) {
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave(input: { title: string; body: string }) {
    if (!editingAnnouncement) return;

    setSaving(true);
    try {
      await updateAnnouncementRequest(editingAnnouncement.id, input);
      setEditingAnnouncement(null);
      onChanged?.();
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : 'Could not update announcement.',
      );
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingAnnouncement) return;

    setDeleting(true);
    try {
      await deleteAnnouncementRequest(deletingAnnouncement.id);
      setDeletingAnnouncement(null);
      onChanged?.();
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : 'Could not delete announcement.',
      );
    } finally {
      setDeleting(false);
    }
  }

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
    <>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/announcements/${announcement.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        View
                      </Link>
                      {canUpdate ? (
                        <button
                          type="button"
                          onClick={() => setEditingAnnouncement(announcement)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => setDeletingAnnouncement(announcement)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 transition hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <EditAnnouncementModal
        announcement={editingAnnouncement}
        open={Boolean(editingAnnouncement)}
        saving={saving}
        onClose={() => !saving && setEditingAnnouncement(null)}
        onSave={handleSave}
      />

      <DeleteAnnouncementConfirmModal
        announcement={deletingAnnouncement}
        open={Boolean(deletingAnnouncement)}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => !deleting && setDeletingAnnouncement(null)}
      />
    </>
  );
}
