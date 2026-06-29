'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  updateIssueReportRequest,
  type SerializedIssueReport,
} from '@/lib/issues/issue-reports-api';
import { ISSUE_REPORT_STATUSES } from '@/lib/types/issue-report';

interface IssueReportsAdminTableProps {
  reports: SerializedIssueReport[];
  loading?: boolean;
  onUpdated?: () => void;
  canManage?: boolean;
}

function formatWhen(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IssueReportsAdminTable({
  reports,
  loading,
  onUpdated,
  canManage = true,
}: IssueReportsAdminTableProps) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  async function handleStatusChange(report: SerializedIssueReport, status: string) {
    setSavingId(report.id);
    try {
      await updateIssueReportRequest(report.id, {
        status: status as (typeof ISSUE_REPORT_STATUSES)[number],
        adminNotes: notesDraft[report.id] ?? report.adminNotes ?? '',
      });
      onUpdated?.();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update report.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleSaveNotes(report: SerializedIssueReport) {
    setSavingId(report.id);
    try {
      await updateIssueReportRequest(report.id, {
        adminNotes: notesDraft[report.id] ?? '',
      });
      onUpdated?.();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not save notes.');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        Loading issue reports…
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center text-sm text-muted">
        No issue reports yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-2xl border border-border bg-surface-raised p-4 md:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{report.subject}</p>
              <p className="mt-1 text-xs text-subtle">
                {report.employeeName} ({report.employeeId}) · {report.category} ·{' '}
                {formatWhen(report.createdAt)}
              </p>
              <p className="mt-1 text-xs text-muted">{report.reporterEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              {canManage ? (
                <select
                  value={report.status}
                  disabled={savingId === report.id}
                  onChange={(event) => void handleStatusChange(report, event.target.value)}
                  className="rounded-lg border border-border bg-surface-base px-2.5 py-1.5 text-xs text-foreground"
                >
                  {ISSUE_REPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-lg border border-border bg-surface-base px-2.5 py-1.5 text-xs text-muted">
                  {report.status.replace('_', ' ')}
                </span>
              )}
              {savingId === report.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted" />
              ) : null}
            </div>
          </div>

          <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{report.description}</p>

          {report.attachmentUrl ? (
            <a
              href={report.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              View attachment
            </a>
          ) : null}

          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-muted">Admin notes</label>
            {canManage ? (
              <>
                <textarea
                  rows={2}
                  value={notesDraft[report.id] ?? report.adminNotes ?? ''}
                  disabled={savingId === report.id}
                  onChange={(event) =>
                    setNotesDraft((current) => ({
                      ...current,
                      [report.id]: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="Internal notes or reply to the employee"
                />
                <button
                  type="button"
                  disabled={savingId === report.id}
                  onClick={() => void handleSaveNotes(report)}
                  className="rounded-lg border border-border-strong px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground disabled:opacity-60"
                >
                  Save notes
                </button>
              </>
            ) : (
              <p className="whitespace-pre-wrap rounded-lg border border-border bg-surface-base px-3 py-2 text-sm text-muted">
                {report.adminNotes?.trim() || '—'}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
