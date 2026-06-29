'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ISSUE_REPORT_CATEGORIES, ISSUE_REPORT_STATUSES } from '@/lib/types/issue-report';
import type { IssueReportCategory, IssueReportStatus } from '@/lib/types/issue-report';
import type { SerializedIssueReport } from '@/lib/issues/issue-reports-api';

interface EditIssueReportModalProps {
  report: SerializedIssueReport | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: {
    category: IssueReportCategory;
    subject: string;
    description: string;
    status: IssueReportStatus;
    adminNotes: string;
  }) => Promise<void>;
}

export function EditIssueReportModal({
  report,
  open,
  saving = false,
  onClose,
  onSave,
}: EditIssueReportModalProps) {
  const [category, setCategory] = useState<IssueReportCategory>('Other');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<IssueReportStatus>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !report) return;
    setCategory(
      (ISSUE_REPORT_CATEGORIES as readonly string[]).includes(report.category)
        ? (report.category as IssueReportCategory)
        : 'Other',
    );
    setSubject(report.subject);
    setDescription(report.description);
    setStatus(
      (ISSUE_REPORT_STATUSES as readonly string[]).includes(report.status)
        ? (report.status as IssueReportStatus)
        : 'open',
    );
    setAdminNotes(report.adminNotes ?? '');
    setError('');
  }, [open, report]);

  if (!open || !report) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }

    try {
      await onSave({
        category,
        subject: subject.trim(),
        description: description.trim(),
        status,
        adminNotes: adminNotes.trim(),
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save changes.',
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={() => !saving && onClose()}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Edit issue report</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted">Category</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as IssueReportCategory)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              {ISSUE_REPORT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Subject</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Status</label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as IssueReportStatus)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              {ISSUE_REPORT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-muted">Admin notes</label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white hover:opacity-90 disabled:opacity-70"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
