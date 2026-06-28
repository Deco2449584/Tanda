'use client';

import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

const STATUS_CLASSES: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  resolved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

function formatWhen(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[report.status] ?? STATUS_CLASSES.open}`}
            >
              {STATUS_LABELS[report.status] ?? report.status}
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
