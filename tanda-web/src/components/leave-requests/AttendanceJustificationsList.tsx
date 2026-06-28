'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  acknowledgeJustificationRequest,
  fetchLateArrivalFeedback,
  fetchNoShowJustifications,
} from '@/lib/attendance/justification-api';
import { requestOverlapsRange } from '@/lib/leave-requests/format';
import type { DateRange } from '@/lib/attendance/date-range';
import type { AttendanceJustification } from '@/lib/types/attendance-justification';
import type { Employee } from '@/lib/types/employee';

export type JustificationView = 'late' | 'no_show';

interface AttendanceJustificationsListProps {
  view: JustificationView;
  dateRange: DateRange;
  employeesByCode: Record<string, Employee>;
  searchQuery: string;
}

function statusLabel(
  item: AttendanceJustification,
): string {
  if (item.adminAcknowledgedAt) {
    return 'Reviewed';
  }

  switch (item.status) {
    case 'submitted':
      return 'Submitted';
    case 'pending':
      return 'Pending review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'awaiting_employee':
      return 'Awaiting employee';
    default:
      return item.status;
  }
}

function statusBadgeClass(item: AttendanceJustification): string {
  if (item.adminAcknowledgedAt) {
    return 'bg-emerald-500/15 text-emerald-400';
  }

  if (item.status === 'pending' || item.status === 'awaiting_employee') {
    return 'bg-amber-500/15 text-amber-300';
  }

  if (item.status === 'rejected') {
    return 'bg-red-500/15 text-red-400';
  }

  return 'bg-surface-hover text-muted';
}

function matchesSearch(
  item: AttendanceJustification,
  employeesByCode: Record<string, Employee>,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const employee = employeesByCode[item.employeeId];
  const haystack = [
    item.employeeName,
    item.employeeId,
    item.employeeEmail,
    employee?.name,
    employee?.email,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function AttendanceJustificationsList({
  view,
  dateRange,
  employeesByCode,
  searchQuery,
}: AttendanceJustificationsListProps) {
  const [items, setItems] = useState<AttendanceJustification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows =
        view === 'late'
          ? await fetchLateArrivalFeedback()
          : await fetchNoShowJustifications();
      setItems(rows);
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
  }, [view]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesDate = requestOverlapsRange(
        item.date,
        item.date,
        dateRange.start,
        dateRange.end,
      );
      return matchesDate && matchesSearch(item, employeesByCode, searchQuery);
    });
  }, [dateRange.end, dateRange.start, employeesByCode, items, searchQuery]);

  async function handleAcknowledge(item: AttendanceJustification) {
    if (item.adminAcknowledgedAt) return;

    setAcknowledgingId(item.id);
    setError(null);

    try {
      await acknowledgeJustificationRequest(item.id);
      await loadItems();
    } catch (ackError) {
      setError(
        ackError instanceof Error
          ? ackError.message
          : 'Could not mark as reviewed.',
      );
    } finally {
      setAcknowledgingId(null);
    }
  }

  if (loading) {
    return <LoadingIndicator message="Loading justifications…" className="h-48" />;
  }

  return (
    <section className="space-y-3">
      {error ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      {filteredItems.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface-raised px-4 py-8 text-center text-sm text-subtle">
          No justifications found for this period.
        </p>
      ) : (
        <ul className="divide-y divide-border/80 overflow-hidden rounded-xl border border-border bg-surface-raised md:space-y-0">
          {filteredItems.map((item) => {
            const employee = employeesByCode[item.employeeId];
            const displayName =
              item.employeeName || employee?.name || item.employeeId || 'Employee';
            const reviewed = Boolean(item.adminAcknowledgedAt);

            return (
              <li
                key={item.id}
                className={`px-4 py-3 ${
                  reviewed ? 'bg-emerald-950/10' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.date} · {item.shiftStartTime}–{item.shiftEndTime}
                      {view === 'late' &&
                      typeof item.lateMinutes === 'number' &&
                      item.lateMinutes > 0
                        ? ` · ${item.lateMinutes} min late`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span
                      title={
                        reviewed && item.adminAcknowledgedByEmail
                          ? `Reviewed by ${item.adminAcknowledgedByEmail}`
                          : undefined
                      }
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(item)}`}
                    >
                      {statusLabel(item)}
                    </span>
                    <button
                      type="button"
                      title={
                        reviewed
                          ? `Reviewed${item.adminAcknowledgedByEmail ? ` by ${item.adminAcknowledgedByEmail}` : ''}`
                          : 'Mark as reviewed'
                      }
                      disabled={reviewed || acknowledgingId === item.id}
                      onClick={() => void handleAcknowledge(item)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        reviewed
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                          : 'border-border-strong bg-surface-base text-muted hover:border-emerald-500/40 hover:text-emerald-400 disabled:opacity-60'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{item.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
