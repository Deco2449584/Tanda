'use client';

import { FormEvent, useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';
import { uploadIssueAttachment } from '@/lib/media/storage-uploads';
import { createIssueReportRequest } from '@/lib/issues/issue-reports-api';
import { ISSUE_REPORT_CATEGORIES } from '@/lib/types/issue-report';

interface ReportIssueFormProps {
  employeeId: string;
  disabled?: boolean;
  onSubmitted?: () => void;
}

export function ReportIssueForm({
  employeeId,
  disabled = false,
  onSubmitted,
}: ReportIssueFormProps) {
  const [category, setCategory] = useState<string>(ISSUE_REPORT_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const draftId = crypto.randomUUID();
      let attachmentUrl: string | undefined;
      let attachmentPath: string | undefined;

      if (attachmentFile) {
        const optimized = await optimizeImageForUpload(attachmentFile, 'attendance');
        const uploaded = await uploadIssueAttachment(employeeId, draftId, optimized);
        attachmentUrl = uploaded.attachmentUrl;
        attachmentPath = uploaded.attachmentPath;
      }

      await createIssueReportRequest({
        category: category as (typeof ISSUE_REPORT_CATEGORIES)[number],
        subject,
        description,
        attachmentUrl,
        attachmentPath,
      });

      setSubject('');
      setDescription('');
      setAttachmentFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setSuccess(true);
      onSubmitted?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit your report.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-4 rounded-2xl border border-border bg-surface-raised p-5 md:p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">Report an issue</h2>
        <p className="mt-1 text-xs text-subtle">
          Describe the problem. Your administrator will review it and update the status.
        </p>
      </div>

      <div>
        <label htmlFor="issue-category" className="mb-1.5 block text-xs font-medium text-muted">
          Category
        </label>
        <select
          id="issue-category"
          value={category}
          disabled={disabled || saving}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
        >
          {ISSUE_REPORT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="issue-subject" className="mb-1.5 block text-xs font-medium text-muted">
          Subject
        </label>
        <input
          id="issue-subject"
          type="text"
          required
          maxLength={120}
          value={subject}
          disabled={disabled || saving}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          placeholder="Brief summary"
        />
      </div>

      <div>
        <label htmlFor="issue-description" className="mb-1.5 block text-xs font-medium text-muted">
          Description
        </label>
        <textarea
          id="issue-description"
          required
          rows={5}
          value={description}
          disabled={disabled || saving}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full resize-y rounded-lg border border-border bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          placeholder="What happened? Include steps to reproduce if relevant."
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">
          Screenshot (optional)
        </label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2.5 text-xs text-muted transition hover:border-primary/40 hover:text-foreground">
          <ImagePlus className="h-4 w-4" />
          {attachmentFile ? attachmentFile.name : 'Attach screenshot'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            disabled={disabled || saving}
            className="hidden"
            onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-400">
          Issue submitted. Thank you — we will review it soon.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || saving}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? 'Submitting…' : 'Submit report'}
      </button>
    </form>
  );
}
