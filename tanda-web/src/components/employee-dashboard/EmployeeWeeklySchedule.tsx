'use client';

import Link from 'next/link';
import {
  AlertCircle,
  CalendarOff,
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { compareInputDates, normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import { formatTimeLabel, formatWeekRangeLabel, type WeekDay } from '@/lib/schedule/week';
import type { Shift, ShiftStatus } from '@/lib/types/shift';

interface EmployeeWeeklyScheduleProps {
  weekDays: WeekDay[];
  weekStart: string;
  weekEnd: string;
  shiftsByDate: Record<string, Shift>;
  loading: boolean;
  showViewAllLink?: boolean;
}

function dayNumber(date: string): number {
  return new Date(`${date}T12:00:00`).getDate();
}

const STATUS_META: Record<
  ShiftStatus,
  { label: string; chipClass: string; icon: typeof Clock }
> = {
  scheduled: {
    label: 'Scheduled',
    chipClass: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    chipClass: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
    icon: CheckCircle2,
  },
  absent: {
    label: 'Absent',
    chipClass: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    icon: AlertCircle,
  },
};

export function EmployeeWeeklySchedule({
  weekDays,
  weekStart,
  weekEnd,
  shiftsByDate,
  loading,
  showViewAllLink = true,
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

  return (
    <section className="overflow-hidden rounded-2xl border border-border/90 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-border/80 bg-surface-raised/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            This week
          </p>
          <h2 className="mt-1 text-base font-bold text-white md:text-lg">
            My schedule
          </h2>
          <p className="mt-0.5 text-xs text-subtle">{weekLabel}</p>
        </div>

        <div className="flex items-center gap-3">
          {!loading && (
            <p className="rounded-full bg-surface-hover/80 px-3 py-1 text-xs font-medium text-muted">
              {scheduledCount} shift{scheduledCount === 1 ? '' : 's'} this week
            </p>
          )}
          {showViewAllLink && (
            <Link
              href="/my-schedule"
              className="inline-flex items-center gap-1 rounded-lg border border-border-strong bg-surface-hover/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
            >
              Full schedule
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {loading ? (
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
                    className={`flex min-w-[88px] flex-col rounded-xl border border-dashed border-border bg-surface-base/50 p-3 md:min-w-0 ${
                      isPast ? 'opacity-55' : ''
                    } ${isToday ? 'ring-2 ring-zinc-600 ring-offset-2 ring-offset-zinc-950' : ''}`}
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

              const meta = STATUS_META[shift.status];
              const StatusIcon = meta.icon;

              return (
                <article
                  key={day.date}
                  className={`flex min-w-[108px] flex-col rounded-xl border p-3 transition-colors md:min-w-0 ${
                    isToday
                      ? 'border-primary/60 bg-primary/10 shadow-[0_0_24px_-8px] shadow-primary/40 ring-2 ring-primary/50 ring-offset-2 ring-offset-zinc-950'
                      : shift.status === 'completed'
                        ? 'border-emerald-500/30 bg-emerald-950/25'
                        : shift.status === 'absent'
                          ? 'border-amber-500/35 bg-amber-950/20'
                          : 'border-sky-500/30 bg-sky-950/20'
                  } ${isPast && !isToday ? 'opacity-80' : ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <p
                      className={`text-[11px] font-bold uppercase tracking-wide ${
                        isToday ? 'text-primary' : 'text-muted'
                      }`}
                    >
                      {day.label}
                    </p>
                    {isToday && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Today
                      </span>
                    )}
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
                </article>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border/80 px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-subtle md:px-5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
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
      )}
    </section>
  );
}
