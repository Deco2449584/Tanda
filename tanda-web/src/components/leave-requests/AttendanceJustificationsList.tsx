'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, MessageSquare } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
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

function statusLabel(status: AttendanceJustification['status']): string {
  switch (status) {
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
      return status;
  }
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

  const Icon = view === 'late' ? MessageSquare : Clock;
  const title =
    view === 'late' ? 'Late arrival justifications' : 'No-show justifications';
  const description =
    view === 'late'
      ? 'Informative notes submitted by staff after arriving late. No approval is required.'
      : 'Informative explanations submitted after a no-show.';

  if (loading) {
    return <LoadingIndicator message="Loading justifications…" className="h-48" />;
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-lg p-2 ${
              view === 'late'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-red-500/15 text-red-400'
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="mt-0.5 text-xs text-subtle">{description}</p>
          </div>
        </div>
      </div>

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
        <ul className="space-y-3">
          {filteredItems.map((item) => {
            const employee = employeesByCode[item.employeeId];
            const displayName =
              item.employeeName || employee?.name || item.employeeId || 'Employee';

            return (
              <li
                key={item.id}
                className="rounded-xl border border-border bg-surface-raised p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="mt-0.5 text-xs text-subtle">
                      {item.date} · {item.shiftStartTime}–{item.shiftEndTime}
                      {view === 'late' &&
                      typeof item.lateMinutes === 'number' &&
                      item.lateMinutes > 0
                        ? ` · ${item.lateMinutes} min late`
                        : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{item.reason}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
