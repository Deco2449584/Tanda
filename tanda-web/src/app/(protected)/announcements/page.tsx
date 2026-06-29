'use client';

import { useCallback, useEffect, useState } from 'react';
import { BroadcastAnnouncementForm } from '@/components/announcements/BroadcastAnnouncementForm';
import { AnnouncementHistoryTable } from '@/components/announcements/AnnouncementHistoryTable';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { fetchAnnouncements } from '@/lib/announcements/announcement-api';
import type { Announcement } from '@/lib/types/announcement';
import { useEmployees } from '@/providers/EmployeesProvider';
import { useLocations } from '@/providers/LocationsProvider';

function deriveDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim();
  if (!email) return 'Administrator';
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AnnouncementsPage() {
  const { user } = useAuthRole();
  const { canPerformAction } = useAdminAccess();
  const canPublishAnnouncements = canPerformAction('announcements', 'publish');
  const { employees, loading: employeesLoading } = useEmployees();
  const { locations, loading: locationsLoading } = useLocations();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const adminName = deriveDisplayName(user?.displayName, user?.email);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchAnnouncements();
      setAnnouncements(items);
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        text:
          error instanceof Error
            ? error.message
            : 'Could not load announcement history.',
        variant: 'error',
      });
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const pageLoading = employeesLoading || locationsLoading;

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast messages to employees via in-app notifications and email."
      />

      {pageLoading ? (
        <LoadingIndicator message="Loading employees and locations…" />
      ) : canPublishAnnouncements ? (
        <BroadcastAnnouncementForm
          employees={employees}
          locations={locations}
          adminName={adminName}
          onSent={() => {
            setToast({
              id: crypto.randomUUID(),
              text: 'Announcement sent successfully.',
              variant: 'success',
            });
            void loadHistory();
          }}
          onError={(message) => {
            setToast({
              id: crypto.randomUUID(),
              text: message,
              variant: 'error',
            });
          }}
        />
      ) : (
        <p className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-muted">
          You can view announcement history but do not have permission to publish new
          messages.
        </p>
      )}

      <AnnouncementHistoryTable announcements={announcements} loading={loading} />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
