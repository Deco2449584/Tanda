'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { AttendanceJustification } from '@/lib/types/attendance-justification';
import {
  fetchJustification,
  submitJustificationReason,
} from '@/lib/attendance/justification-api';

interface SubmitJustificationModalProps {
  justificationId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function SubmitJustificationModal({
  justificationId,
  onClose,
  onSubmitted,
}: SubmitJustificationModalProps) {
  const [justification, setJustification] = useState<AttendanceJustification | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!justificationId) {
      setJustification(null);
      setReason('');
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchJustification(justificationId)
      .then((record) => {
        if (cancelled) return;
        setJustification(record);
        setReason(record?.reason ?? '');
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Could not load justification.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [justificationId]);

  if (!justificationId) return null;

  const alreadySubmitted =
    justification?.status === 'submitted' ||
    justification?.status === 'pending' ||
    justification?.status === 'approved' ||
    justification?.status === 'rejected';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!justificationId || !reason.trim()) {
      setError('Please enter a reason.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitJustificationReason({
        justificationId,
        reason: reason.trim(),
      });
      onSubmitted?.();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not submit justification.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="justify-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-amber-500/15 p-2.5 text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="justify-title" className="text-base font-semibold text-white">
              {justification?.type === 'no_show'
                ? 'Explain your absence'
                : 'Late arrival justification'}
            </h2>
            <p className="mt-1 text-sm text-subtle">
              {justification
                ? `${justification.date} · ${justification.shiftStartTime}–${justification.shiftEndTime}`
                : 'Loading shift details…'}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-subtle">Loading…</p>
        ) : alreadySubmitted ? (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-muted">
              {justification?.status === 'submitted'
                ? 'Your note was shared with your manager. No approval is required.'
                : justification?.status === 'pending'
                  ? 'Your explanation was submitted and is awaiting admin review.'
                  : justification?.status === 'approved'
                    ? 'This explanation was approved.'
                    : 'This explanation was rejected.'}
            </p>
            {justification?.reason ? (
              <p className="rounded-lg border border-border bg-surface-base/50 px-3 py-2 text-sm text-foreground">
                {justification.reason}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-hover"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4">
            <div>
              <label htmlFor="justify-reason" className="mb-1.5 block text-sm text-muted">
                Reason
              </label>
              <textarea
                id="justify-reason"
                rows={4}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Briefly explain what happened…"
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 text-sm font-semibold text-muted hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
