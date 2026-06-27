'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Clock, MessageSquare, X } from 'lucide-react';
import {
  fetchLateArrivalFeedback,
  fetchPendingNoShowJustifications,
  reviewJustificationRequest,
} from '@/lib/attendance/justification-api';
import type { AttendanceJustification } from '@/lib/types/attendance-justification';

export function AttendanceInsightsPanel() {
  const [lateFeedback, setLateFeedback] = useState<AttendanceJustification[]>([]);
  const [noShowItems, setNoShowItems] = useState<AttendanceJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [lateItems, pendingNoShows] = await Promise.all([
        fetchLateArrivalFeedback(),
        fetchPendingNoShowJustifications(),
      ]);
      setLateFeedback(lateItems);
      setNoShowItems(pendingNoShows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load attendance insights.',
      );
      setLateFeedback([]);
      setNoShowItems([]);
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
      setNoShowItems((current) => current.filter((item) => item.id !== justificationId));
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : 'Could not review no-show explanation.',
      );
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <p className="text-sm text-subtle">Loading attendance insights…</p>
      </section>
    );
  }

  if (lateFeedback.length === 0 && noShowItems.length === 0 && !error) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Attendance insights</h2>
        <p className="mt-1 text-xs text-subtle">
          Late arrival notes from staff and no-show explanations awaiting review.
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {lateFeedback.length > 0 ? (
        <div className="mb-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-medium text-foreground">Late arrival feedback</h3>
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold text-muted">
              {lateFeedback.length}
            </span>
          </div>

          <ul className="space-y-2">
            {lateFeedback.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-border/80 bg-surface-base/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.employeeName || item.employeeId}
                    </p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {item.date} · {item.shiftStartTime}–{item.shiftEndTime}
                      {typeof item.lateMinutes === 'number' && item.lateMinutes > 0
                        ? ` · ${item.lateMinutes} min late`
                        : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Feedback only
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {noShowItems.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-medium text-foreground">No-show reviews</h3>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
              {noShowItems.length}
            </span>
          </div>

          <ul className="space-y-3">
            {noShowItems.map((item) => (
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
        </div>
      ) : null}
    </section>
  );
}
