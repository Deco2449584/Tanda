'use client';

import Link from 'next/link';
import {
  CalendarOff,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { ShiftConfirmationBadge } from '@/components/shifts/ShiftConfirmationActions';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { getShiftStatusMeta } from '@/lib/employee-dashboard/shift-status-styles';
import { compareInputDates, normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import { formatTimeLabel, formatWeekRangeLabel, type WeekDay } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

interface EmployeeWeeklyScheduleProps {
  weekDays: WeekDay[];
  weekStart: string;
  weekEnd: string;
  shiftsByDate: Record<string, Shift>;
  loading: boolean;
  showViewAllLink?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseSummary?: string;
}

function dayNumber(date: string): number {
  return new Date(`${date}T12:00:00`).getDate();
}

export function EmployeeWeeklySchedule({
  weekDays,
  weekStart,
  weekEnd,
  shiftsByDate,
  loading,
  showViewAllLink = true,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  collapseSummary,
}: EmployeeWeeklyScheduleProps) {
  const today = toInputDate();
  const weekLabel = formatWeekRangeLabel({
    start: weekStart,
    end: weekEnd,
    days: weekDays,
  });

  const scheduledCount = weekDays.filter(
    (day) => shiftsByDate[normalizeInputDate(day.date)],
  ).length;

  const summary =
    collapseSummary ??
    (loading ? 'Loading…' : `${scheduledCount} shift${scheduledCount === 1 ? '' : 's'} this week`);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="relative border-b border-border bg-surface-raised px-4 py-4 md:px-5">
        {collapsible && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-base/80 text-muted transition-colors hover:bg-surface-hover hover:text-foreground md:right-4 md:top-4"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand weekly schedule' : 'Collapse weekly schedule'}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronUp className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : null}

        <div className="min-w-0 pr-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            This week
          </p>
          <h2 className="mt-1 text-base font-bold text-white md:text-lg">
            My schedule
          </h2>
          {!collapsed ? (
            <p className="mt-0.5 text-xs text-subtle">{weekLabel}</p>
          ) : (
            <p className="mt-1 truncate text-sm text-muted">{summary}</p>
          )}
        </div>

        {!collapsed ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!loading ? (
              <p className="rounded-full bg-surface-hover/80 px-3 py-1 text-xs font-medium text-muted">
                {scheduledCount} shift{scheduledCount === 1 ? '' : 's'} this week
              </p>
            ) : null}
            {showViewAllLink ? (
              <Link
                href="/my-schedule"
                className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface-hover/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-primary/10 hover:text-foreground"
              >
                Full schedule
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {!collapsed ? (
        loading ? (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 md:grid-cols-7 md:gap-3 md:p-5">
            {weekDays.map((day) => (
              <div
                key={day.date}
                className="h-28 animate-pulse rounded-xl bg-surface-hover/60"
                aria-hidden
              />
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto p-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:grid-cols-7 md:gap-3 md:overflow-visible md:p-5 md:pb-3 [&::-webkit-scrollbar]:hidden">
              {weekDays.map((day) => {
                const dateKey = normalizeInputDate(day.date);
                const shift = shiftsByDate[dateKey];
                const isToday = dateKey === today;
                const isPast = compareInputDates(dateKey, today) < 0;

                if (!shift) {
                  return (
                    <article
                      key={day.date}
                      className={`flex min-w-[88px] flex-col rounded-xl border border-dashed border-border bg-surface-base p-3 md:min-w-0 ${
                        isPast ? 'opacity-55' : ''
                      } ${
                        isToday
                          ? 'ring-2 ring-border-strong ring-offset-2 ring-offset-surface-raised'
                          : ''
                      }`}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-subtle">
                        {day.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-subtle">
                        {dayNumber(day.date)}
                      </p>
                      <div className="mt-auto flex items-center gap-1.5 pt-3 text-subtle">
                        <CalendarOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">
                          Off
                        </span>
                      </div>
                    </article>
                  );
                }

                const meta = getShiftStatusMeta(shift.status);
                const StatusIcon = meta.icon;

                return (
                  <article
                    key={day.date}
                    className={`flex min-w-[108px] flex-col rounded-xl border p-3 transition-colors md:min-w-0 ${meta.dayCardClass} ${
                      isToday ? meta.todayRingClass : ''
                    } ${isPast && !isToday ? 'opacity-80' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {day.label}
                      </p>
                      {isToday ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${meta.todayBadgeClass}`}
                        >
                          Today
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-2xl font-bold text-white">
                      {dayNumber(day.date)}
                    </p>
                    <p className="mt-2 text-[11px] font-medium leading-tight text-muted">
                      {formatTimeLabel(shift.startTime)}
                      <span className="text-subtle"> – </span>
                      {formatTimeLabel(shift.endTime)}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-subtle">
                      {formatShortDate(shift.date)}
                    </p>
                    <span
                      className={`mt-3 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chipClass}`}
                    >
                      <StatusIcon className="h-3 w-3 shrink-0" aria-hidden />
                      {meta.label}
                    </span>
                    {shift.status === 'scheduled' && shift.confirmationStatus ? (
                      <div className="mt-2">
                        <ShiftConfirmationBadge shift={shift} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-subtle md:px-5">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/80" />
                Scheduled
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Absent
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full border border-dashed border-zinc-600" />
                Day off
              </span>
            </div>
          </>
        )
      ) : null}
    </section>
  );
}
