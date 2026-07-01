'use client';

import { FormEvent, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import {
  getShiftConfirmationChipClass,
  getShiftConfirmationLabel,
  needsShiftConfirmation,
} from '@/lib/shifts/shift-confirmation';
import { respondToShiftConfirmationRequest } from '@/lib/shifts/shift-confirmation-api';
import type { Shift } from '@/lib/types/shift';

interface ShiftConfirmationActionsProps {
  shift: Shift;
  onUpdated?: (shift: Shift) => void;
  compact?: boolean;
}

export function ShiftConfirmationBadge({ shift }: { shift: Shift }) {
  if (!shift.confirmationStatus || shift.status !== 'scheduled') return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getShiftConfirmationChipClass(shift.confirmationStatus)}`}
    >
      {getShiftConfirmationLabel(shift.confirmationStatus)}
    </span>
  );
}

export function ShiftConfirmationActions({
  shift,
  onUpdated,
  compact = false,
}: ShiftConfirmationActionsProps) {
  const [submitting, setSubmitting] = useState<'confirmed' | 'declined' | null>(null);
  const [showDeclineNote, setShowDeclineNote] = useState(false);
  const [declineNote, setDeclineNote] = useState('');
  const [error, setError] = useState('');

  if (!needsShiftConfirmation(shift)) {
    if (shift.confirmationStatus && shift.status === 'scheduled') {
      return (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          <ShiftConfirmationBadge shift={shift} />
          {shift.confirmationStatus === 'declined' && shift.confirmationNote ? (
            <p className="mt-2 text-xs text-muted">{shift.confirmationNote}</p>
          ) : null}
        </div>
      );
    }
    return null;
  }

  async function handleConfirm() {
    setError('');
    setSubmitting('confirmed');
    try {
      const updated = await respondToShiftConfirmationRequest({
        shiftId: shift.id,
        response: 'confirmed',
      });
      onUpdated?.(updated);
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not confirm shift.',
      );
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDecline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting('declined');
    try {
      const updated = await respondToShiftConfirmationRequest({
        shiftId: shift.id,
        response: 'declined',
        note: declineNote,
      });
      setShowDeclineNote(false);
      setDeclineNote('');
      onUpdated?.(updated);
    } catch (declineError) {
      setError(
        declineError instanceof Error
          ? declineError.message
          : 'Could not decline shift.',
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className={compact ? 'mt-3' : 'mt-4 border-t border-border/80 pt-4'}>
      <p className="text-xs font-medium text-amber-200">
        Can you work this shift?
      </p>

      {!showDeclineNote ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={submitting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting === 'confirmed' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            I can attend
          </button>
          <button
            type="button"
            onClick={() => setShowDeclineNote(true)}
            disabled={submitting !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            I cannot attend
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void handleDecline(event)} className="mt-2 space-y-2">
          <label htmlFor={`decline-note-${shift.id}`} className="block text-xs text-muted">
            Brief reason (required)
          </label>
          <textarea
            id={`decline-note-${shift.id}`}
            value={declineNote}
            onChange={(event) => setDeclineNote(event.target.value)}
            rows={2}
            maxLength={280}
            disabled={submitting !== null}
            placeholder="e.g. Medical appointment that day"
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting !== null || !declineNote.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {submitting === 'declined' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
              Send decline
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDeclineNote(false);
                setDeclineNote('');
                setError('');
              }}
              disabled={submitting !== null}
              className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
