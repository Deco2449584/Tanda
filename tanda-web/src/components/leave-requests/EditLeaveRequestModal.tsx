'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { LEAVE_REQUEST_STATUSES, LEAVE_REQUEST_TYPES } from '@/lib/constants';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

interface EditLeaveRequestModalProps {
  request: LeaveRequest | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: {
    type: string;
    startDate: string;
    endDate: string;
    justification: string;
    status: LeaveRequestStatus;
  }) => Promise<void>;
}

export function EditLeaveRequestModal({
  request,
  open,
  saving = false,
  onClose,
  onSave,
}: EditLeaveRequestModalProps) {
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [justification, setJustification] = useState('');
  const [status, setStatus] = useState<LeaveRequestStatus>('Pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !request) return;
    setType(request.type);
    setStartDate(request.startDate);
    setEndDate(request.endDate);
    setJustification(request.justification);
    setStatus(request.status);
    setError('');
  }, [open, request]);

  if (!open || !request) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Select a date range.');
      return;
    }
    if (startDate > endDate) {
      setError('End date must be on or after start date.');
      return;
    }
    if (!justification.trim()) {
      setError('Enter a justification.');
      return;
    }

    try {
      await onSave({
        type,
        startDate,
        endDate,
        justification: justification.trim(),
        status,
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
      aria-labelledby="edit-leave-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close modal"
        onClick={() => !saving && onClose()}
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="edit-leave-title" className="text-lg font-semibold text-white">
            Edit leave request
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">
          Employee <span className="font-mono text-foreground">{request.employeeId}</span>
        </p>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="edit-leave-type" className="mb-1.5 block text-sm text-muted">
              Leave type
            </label>
            <select
              id="edit-leave-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              {LEAVE_REQUEST_TYPES.map((leaveType) => (
                <option key={leaveType} value={leaveType}>
                  {leaveType}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-leave-start" className="mb-1.5 block text-sm text-muted">
                From
              </label>
              <input
                id="edit-leave-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="edit-leave-end" className="mb-1.5 block text-sm text-muted">
                To
              </label>
              <input
                id="edit-leave-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-leave-status" className="mb-1.5 block text-sm text-muted">
              Status
            </label>
            <select
              id="edit-leave-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as LeaveRequestStatus)}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-primary"
            >
              {LEAVE_REQUEST_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="edit-leave-justification"
              className="mb-1.5 block text-sm text-muted"
            >
              Justification
            </label>
            <textarea
              id="edit-leave-justification"
              rows={4}
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
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
