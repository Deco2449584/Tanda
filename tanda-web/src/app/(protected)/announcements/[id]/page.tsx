'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { useAuthRole } from '@/hooks/useAuthRole';
import { isAdminAreaRole } from '@/lib/auth/roles';
import { fetchAnnouncement } from '@/lib/announcements/announcement-api';
import type { Announcement } from '@/lib/types/announcement';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';

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
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!announcementId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchAnnouncement(announcementId)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setError('This announcement could not be found.');
          setAnnouncement(null);
          return;
        }
        setAnnouncement(record);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load announcement.',
        );
        setAnnouncement(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [announcementId]);

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
        </article>
      ) : null}
    </PageContent>
  );
}
