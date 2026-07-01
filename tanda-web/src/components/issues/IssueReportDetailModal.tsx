'use client';

import { useEffect, useState } from 'react';
import { Loader2, Pencil, Trash2, X } from 'lucide-react';
import { IssueReportAttachment } from '@/components/issues/IssueReportAttachment';
import {
  formatIssueReportWhen,
  ISSUE_STATUS_CLASSES,
  ISSUE_STATUS_LABELS,
} from '@/components/issues/issue-report-status';
import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';
import { ISSUE_REPORT_STATUSES } from '@/lib/types/issue-report';
import type { IssueReportStatus } from '@/lib/types/issue-report';

interface IssueReportDetailModalProps {
  report: SerializedIssueReport | null;
  open: boolean;
  saving?: boolean;
  canManage?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onSave: (input: { status: IssueReportStatus; adminNotes: string }) => Promise<void>;
  onEdit: () => void;
  onDelete: () => void;
}

export function IssueReportDetailModal({
  report,
  open,
  saving = false,
  canManage = true,
  canUpdate = true,
  canDelete = true,
  onClose,
  onSave,
  onEdit,
  onDelete,
}: IssueReportDetailModalProps) {
  const [status, setStatus] = useState<IssueReportStatus>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !report) return;
    setStatus(
      (ISSUE_REPORT_STATUSES as readonly string[]).includes(report.status)
        ? (report.status as IssueReportStatus)
        : 'open',
    );
    setAdminNotes(report.adminNotes ?? '');
    setError('');
  }, [open, report]);

  if (!open || !report) return null;

  async function handleSave() {
    setError('');
    try {
      await onSave({ status, adminNotes: adminNotes.trim() });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save changes.',
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close issue details"
        className="absolute inset-0 bg-black/60"
        onClick={() => !saving && onClose()}
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-raised p-5 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ISSUE_STATUS_CLASSES[report.status] ?? ISSUE_STATUS_CLASSES.open}`}
              >
                {ISSUE_STATUS_LABELS[report.status] ?? report.status}
              </span>
              <span className="text-xs text-subtle">{report.category}</span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-white">{report.subject}</h2>
            <p className="mt-1 text-xs text-muted">
              {formatIssueReportWhen(report.createdAt)}
              {report.updatedAt ? ` · Updated ${formatIssueReportWhen(report.updatedAt)}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="grid gap-3 rounded-xl border border-border bg-surface-base/40 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-subtle">Employee</dt>
            <dd className="mt-0.5 font-medium text-foreground">{report.employeeName}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">Employee ID</dt>
            <dd className="mt-0.5 font-mono text-xs text-muted">{report.employeeId}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-subtle">Reporter email</dt>
            <dd className="mt-0.5 text-muted">{report.reporterEmail}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
            Description
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {report.description}
          </p>
        </div>

        {report.attachmentUrl ? (
          <IssueReportAttachment
            reportId={report.id}
            url={report.attachmentUrl}
            alt={report.subject}
          />
        ) : null}

        {report.resolvedAt ? (
          <p className="mt-4 text-xs text-subtle">
            Resolved {formatIssueReportWhen(report.resolvedAt)}
          </p>
        ) : null}

        {canManage ? (
          <div className="mt-6 space-y-4 border-t border-border pt-5">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Status</label>
              <select
                value={status}
                disabled={saving}
                onChange={(event) => setStatus(event.target.value as IssueReportStatus)}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              >
                {ISSUE_REPORT_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {ISSUE_STATUS_LABELS[item] ?? item.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted">Admin notes</label>
              <textarea
                rows={3}
                value={adminNotes}
                disabled={saving}
                onChange={(event) => setAdminNotes(event.target.value)}
                placeholder="Internal notes or reply to the employee"
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtle">
              Admin notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">
              {report.adminNotes?.trim() || '—'}
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {canUpdate ? (
            <button
              type="button"
              onClick={onEdit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit report
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-950/40 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
