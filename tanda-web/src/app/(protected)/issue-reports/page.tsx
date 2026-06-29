'use client';

import { useCallback, useEffect, useState } from 'react';
import { IssueReportsAdminTable } from '@/components/issues/IssueReportsAdminTable';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { fetchIssueReports } from '@/lib/issues/issue-reports-api';
import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';

export default function IssueReportsAdminPage() {
  const { canPerformAction } = useAdminAccess();
  const canManageIssueReports = canPerformAction('issueReports', 'manage');
  const canUpdateIssueReports = canPerformAction('issueReports', 'update');
  const canDeleteIssueReports = canPerformAction('issueReports', 'delete');
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
        text: error instanceof Error ? error.message : 'Could not load issue reports.',
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

  return (
    <PageContent className="space-y-6">
      <PageHeader
        title="Issue reports"
        description="Review employee-reported issues and update their status."
      />

      <IssueReportsAdminTable
        reports={reports}
        loading={loading}
        canManage={canManageIssueReports}
        canUpdate={canUpdateIssueReports}
        canDelete={canDeleteIssueReports}
        onUpdated={() => {
          setToast({
            id: crypto.randomUUID(),
            text: 'Report updated.',
            variant: 'success',
          });
          void loadReports();
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
