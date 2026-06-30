'use client';

import {
  formatIssueReportWhen,
  ISSUE_STATUS_CLASSES,
  ISSUE_STATUS_LABELS,
} from '@/components/issues/issue-report-status';
import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';

function formatWhen(value: string | null): string {
  return formatIssueReportWhen(value);
}

interface IssueReportsListProps {
  reports: SerializedIssueReport[];
  loading?: boolean;
}

export function IssueReportsList({ reports, loading }: IssueReportsListProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-muted">
        Loading your reports…
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-6 text-sm text-muted">
        No reports yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {reports.map((report) => (
        <li
          key={report.id}
          className="rounded-2xl border border-border bg-surface-raised p-4 md:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{report.subject}</p>
              <p className="mt-1 text-xs text-subtle">
                {report.category} · {formatWhen(report.createdAt)}
              </p>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ISSUE_STATUS_CLASSES[report.status] ?? ISSUE_STATUS_CLASSES.open}`}
            >
              {ISSUE_STATUS_LABELS[report.status] ?? report.status}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted">{report.description}</p>
          {report.attachmentUrl ? (
            <a
              href={report.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              View attachment
            </a>
          ) : null}
          {report.adminNotes ? (
            <div className="mt-3 rounded-lg border border-border bg-surface-base/60 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                Admin response
              </p>
              <p className="mt-1 text-sm text-foreground">{report.adminNotes}</p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
