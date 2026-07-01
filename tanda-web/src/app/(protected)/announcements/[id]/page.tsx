'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Megaphone, Pencil, Trash2 } from 'lucide-react';
import { DeleteAnnouncementConfirmModal } from '@/components/announcements/DeleteAnnouncementConfirmModal';
import { EditAnnouncementModal } from '@/components/announcements/EditAnnouncementModal';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { isAdminAreaRole } from '@/lib/auth/roles';
import {
  deleteAnnouncementRequest,
  fetchAnnouncement,
  updateAnnouncementRequest,
} from '@/lib/announcements/announcement-api';
import type { Announcement } from '@/lib/types/announcement';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { Toast, type ToastMessage } from '@/components/ui/Toast';

function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export default function AnnouncementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { role } = useAuthRole();
  const announcementId = params.id;
  const isAdmin = isAdminAreaRole(role ?? 'empleado');

  useEffect(() => {
    if (!announcementId || isAdmin) return;
    router.replace(`/announcements#announcement-${announcementId}`);
  }, [announcementId, isAdmin, router]);

  if (!isAdmin) {
    return <LoadingIndicator message="Opening announcement…" />;
  }

  return <AdminAnnouncementDetail announcementId={announcementId} />;
}

function AdminAnnouncementDetail({ announcementId }: { announcementId: string }) {
  const { canPerformAction } = useAdminAccess();
  const canUpdate = canPerformAction('announcements', 'update');
  const canDelete = canPerformAction('announcements', 'delete');

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const router = useRouter();

  const loadAnnouncement = useCallback(async () => {
    if (!announcementId) return;

    setLoading(true);
    setError(null);

    try {
      const record = await fetchAnnouncement(announcementId);
      if (!record) {
        setError('This announcement could not be found.');
        setAnnouncement(null);
        return;
      }
      setAnnouncement(record);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : 'Could not load announcement.',
      );
      setAnnouncement(null);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    void loadAnnouncement();
  }, [loadAnnouncement]);

  async function handleSave(input: { title: string; body: string }) {
    if (!announcement) return;

    setSaving(true);
    try {
      const updated = await updateAnnouncementRequest(announcement.id, input);
      setAnnouncement(updated);
      setToast({
        id: crypto.randomUUID(),
        text: 'Announcement updated.',
        variant: 'success',
      });
    } catch (saveError) {
      setToast({
        id: crypto.randomUUID(),
        text:
          saveError instanceof Error
            ? saveError.message
            : 'Could not update announcement.',
        variant: 'error',
      });
      throw saveError;
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!announcement) return;

    setDeleting(true);
    try {
      await deleteAnnouncementRequest(announcement.id);
      router.replace('/announcements');
    } catch (deleteError) {
      setToast({
        id: crypto.randomUUID(),
        text:
          deleteError instanceof Error
            ? deleteError.message
            : 'Could not delete announcement.',
        variant: 'error',
      });
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <PageContent className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/announcements"
        className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {loading ? <LoadingIndicator message="Loading announcement…" /> : null}

      {error ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {announcement ? (
        <article className="rounded-2xl border border-border bg-surface-raised p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Company announcement
              </p>
              <h1 className="mt-1 text-xl font-semibold text-white">
                {announcement.title}
              </h1>
              {announcement.createdAt ? (
                <p className="mt-1 text-xs text-subtle">
                  {formatDate(announcement.createdAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {announcement.body}
          </div>

          {canUpdate || canDelete ? (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
              {canUpdate ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-surface-hover"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-900/50 px-3 py-2 text-sm text-red-400 transition hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
      ) : null}

      <EditAnnouncementModal
        announcement={announcement}
        open={editOpen}
        saving={saving}
        onClose={() => !saving && setEditOpen(false)}
        onSave={handleSave}
      />

      <DeleteAnnouncementConfirmModal
        announcement={announcement}
        open={deleteOpen}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => !deleting && setDeleteOpen(false)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
