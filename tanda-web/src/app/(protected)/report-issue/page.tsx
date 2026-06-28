'use client';

import { useCallback, useEffect, useState } from 'react';
import { ReportIssueForm } from '@/components/issues/ReportIssueForm';
import { IssueReportsList } from '@/components/issues/IssueReportsList';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { fetchIssueReports } from '@/lib/issues/issue-reports-api';
import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';

export default function ReportIssuePage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading } = useCurrentEmployee(user?.email);
  const [reports, setReports] = useState<SerializedIssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchIssueReports();
      setReports(items);
    } catch (error) {
      setToast({
        id: crypto.randomUUID(),
        text: error instanceof Error ? error.message : 'Could not load your reports.',
        variant: 'error',
      });
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const pageLoading = authLoading || employeeLoading;
  const employeeId = employee?.employeeId ?? '';

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Report an issue"
        description="Tell us about a problem with the app, kiosk, schedule or your account."
      />

      {pageLoading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : employeeId ? (
        <ReportIssueForm
          employeeId={employeeId}
          onSubmitted={() => {
            setToast({
              id: crypto.randomUUID(),
              text: 'Issue submitted successfully.',
              variant: 'success',
            });
            void loadReports();
          }}
        />
      ) : (
        <p className="rounded-xl border border-border bg-surface-raised p-6 text-sm text-muted">
          Your employee profile could not be loaded.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Your reports</h2>
        <IssueReportsList reports={reports} loading={loading} />
      </section>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
