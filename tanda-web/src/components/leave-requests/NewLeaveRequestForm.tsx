'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { LeaveRequestType, NewLeaveRequestInput } from '@/lib/types/leave-request';

const LEAVE_TYPES: LeaveRequestType[] = [
  'Vacation',
  'Medical Leave',
  'Family Emergency',
  'Personal',
];

interface NewLeaveRequestFormProps {
  employeeId: string;
  disabled?: boolean;
}

const initialForm: NewLeaveRequestInput = {
  type: 'Vacation',
  startDate: '',
  endDate: '',
  justification: '',
};

export function NewLeaveRequestForm({
  employeeId,
  disabled = false,
}: NewLeaveRequestFormProps) {
  const [form, setForm] = useState<NewLeaveRequestInput>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!db) {
      setError('Firebase is not available.');
      return;
    }

    if (!form.startDate || !form.endDate) {
      setError('Select a date range.');
      return;
    }

    if (form.startDate > form.endDate) {
      setError('The "To" date must be on or after the "From" date.');
      return;
    }

    if (!form.justification.trim()) {
      setError('Enter a justification.');
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, COLLECTIONS.LEAVE_REQUESTS), {
        employeeId,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        justification: form.justification.trim(),
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      setForm(initialForm);
      setSuccess('Request submitted successfully.');
    } catch {
      setError('Could not submit the request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <h2 className="text-sm font-semibold text-white">New request</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Complete the form to submit your leave request.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="leave-type" className="mb-1.5 block text-sm text-zinc-400">
            Leave type
          </label>
          <select
            id="leave-type"
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value as LeaveRequestType,
              }))
            }
            disabled={disabled || isSubmitting}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 disabled:opacity-60"
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="leave-start" className="mb-1.5 block text-sm text-zinc-400">
              From
            </label>
            <input
              id="leave-start"
              type="date"
              required
              value={form.startDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, startDate: e.target.value }))
              }
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="leave-end" className="mb-1.5 block text-sm text-zinc-400">
              To
            </label>
            <input
              id="leave-end"
              type="date"
              required
              value={form.endDate}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, endDate: e.target.value }))
              }
              disabled={disabled || isSubmitting}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label htmlFor="leave-justification" className="mb-1.5 block text-sm text-zinc-400">
            Justification
          </label>
          <textarea
            id="leave-justification"
            required
            rows={4}
            value={form.justification}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, justification: e.target.value }))
            }
            disabled={disabled || isSubmitting}
            placeholder="Describe the reason for your request..."
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-600 disabled:opacity-60"
          />
        </div>

        {error && (
          <p className="text-center text-xs text-red-500" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="text-center text-xs text-blue-400" role="status">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold tracking-wide text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Submitting...' : 'SUBMIT REQUEST'}
        </button>
      </form>
    </section>
  );
}
