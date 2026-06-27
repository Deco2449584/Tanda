'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import {
  fetchPendingJustifications,
  reviewJustificationRequest,
} from '@/lib/attendance/justification-api';
import type { AttendanceJustification } from '@/lib/types/attendance-justification';

export function PendingJustificationsPanel() {
  const [items, setItems] = useState<AttendanceJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const justifications = await fetchPendingJustifications();
      setItems(justifications);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load justifications.',
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function handleReview(
    justificationId: string,
    status: 'approved' | 'rejected',
  ) {
    setBusyId(justificationId);
    setError(null);

    try {
      await reviewJustificationRequest({ justificationId, status });
      setItems((current) => current.filter((item) => item.id !== justificationId));
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Could not review justification.',
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <p className="text-sm text-subtle">Loading pending justifications…</p>
      </section>
    );
  }

  if (items.length === 0 && !error) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Pending attendance justifications
          </h2>
          <p className="mt-1 text-xs text-subtle">
            Late arrivals and no-shows awaiting your review.
          </p>
        </div>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          {items.length}
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-border bg-surface-base/60 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {item.employeeName || item.employeeId}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {item.date} · {item.shiftStartTime}–{item.shiftEndTime}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                <Clock className="h-3 w-3" />
                {item.type === 'no_show' ? 'No-show' : 'Late'}
                {typeof item.lateMinutes === 'number' && item.lateMinutes > 0
                  ? ` · ${item.lateMinutes}m`
                  : ''}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {item.reason}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void handleReview(item.id, 'approved')}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
              <button
                type="button"
                disabled={busyId === item.id}
                onClick={() => void handleReview(item.id, 'rejected')}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/50 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
