'use client';

import { useMemo } from 'react';
import { isToday, parseISO } from 'date-fns';
import { AlertCircle, Check, Clock } from 'lucide-react';
import { normalizeInputDate } from '@/lib/dates/input-date';
import { formatShiftTimeRangeShort } from '@/lib/schedule/week';
import type { CalendarDayCell } from '@/lib/schedule/month';
import type { Shift, ShiftStatus } from '@/lib/types/shift';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_META: Record<
  ShiftStatus,
  {
    chip: string;
    dot: string;
    label: string;
    Icon: typeof Clock;
  }
> = {
  scheduled: {
    chip: 'border-primary/30 bg-primary/10 text-primary',
    dot: 'bg-primary',
    label: 'Scheduled',
    Icon: Clock,
  },
  completed: {
    chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Completed',
    Icon: Check,
  },
  absent: {
    chip: 'border-orange-500/35 bg-orange-500/10 text-orange-400',
    dot: 'bg-orange-500',
    label: 'Absent',
    Icon: AlertCircle,
  },
};

interface ScheduleMonthCalendarProps {
  days: CalendarDayCell[];
  shifts: Shift[];
  loading: boolean;
  monthLabel: string;
  employeeNames?: Record<string, string>;
  onDayClick?: (date: string) => void;
}

function countByStatus(shifts: Shift[]): Record<ShiftStatus, number> {
  return shifts.reduce(
    (acc, shift) => {
      acc[shift.status] += 1;
      return acc;
    },
    { scheduled: 0, completed: 0, absent: 0 },
  );
}

function MonthShiftChip({
  shift,
  employeeNames,
}: {
  shift: Shift;
  employeeNames: Record<string, string>;
}) {
  const meta = STATUS_META[shift.status];
  const Icon = meta.Icon;
  const name =
    employeeNames[shift.employeeId]?.split(' ')[0] ?? shift.employeeId;

  return (
    <div
      className={`flex items-center gap-1 rounded-md border px-1 py-0.5 ${meta.chip}`}
      title={`${employeeNames[shift.employeeId] ?? shift.employeeId} · ${formatShiftTimeRangeShort(shift.startTime, shift.endTime)} · ${meta.label}`}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[9px] font-semibold leading-none">
        {name}
      </span>
    </div>
  );
}

export function ScheduleMonthCalendar({
  days,
  shifts,
  loading,
  monthLabel,
  employeeNames = {},
  onDayClick,
}: ScheduleMonthCalendarProps) {
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();

    shifts.forEach((shift) => {
      const key = normalizeInputDate(shift.date);
      const existing = map.get(key) ?? [];
      existing.push(shift);
      map.set(key, existing);
    });

    return map;
  }, [shifts]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-surface-raised">
        <p className="text-sm text-muted">Loading monthly calendar...</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface-raised/40 backdrop-blur-sm">
      <div className="border-b border-border bg-surface-base/60 px-4 py-3">
        <h2 className="text-sm font-semibold capitalize text-white">{monthLabel}</h2>
        {onDayClick ? (
          <p className="mt-0.5 text-xs text-subtle">
            Tap a day to assign a shift
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-base/50">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="border-r border-border/60 px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-subtle last:border-r-0 sm:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayShifts = shiftsByDate.get(normalizeInputDate(day.date)) ?? [];
          const today = isToday(parseISO(`${day.date}T12:00:00`));
          const counts = countByStatus(dayShifts);
          const visibleShifts = dayShifts.slice(0, 3);
          const hiddenCount = dayShifts.length - visibleShifts.length;

          return (
            <div
              key={day.date}
              role={onDayClick && day.isCurrentMonth ? 'button' : undefined}
              tabIndex={onDayClick && day.isCurrentMonth ? 0 : undefined}
              onClick={() => {
                if (onDayClick && day.isCurrentMonth) {
                  onDayClick(normalizeInputDate(day.date));
                }
              }}
              onKeyDown={(event) => {
                if (!onDayClick || !day.isCurrentMonth) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onDayClick(normalizeInputDate(day.date));
                }
              }}
              className={`flex min-h-[4.5rem] flex-col border-b border-r border-border/60 p-1 last:border-r-0 sm:min-h-[5.5rem] sm:p-1.5 ${
                day.isCurrentMonth
                  ? onDayClick
                    ? 'cursor-pointer bg-surface-base/20 transition-colors hover:bg-surface-hover/35 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/40'
                    : 'bg-surface-base/20'
                  : 'bg-surface-base/5 opacity-45'
              } ${today && day.isCurrentMonth ? 'bg-primary/5' : ''}`}
            >
              <div className="mb-1 flex items-start justify-between gap-0.5">
                <p
                  className={`text-[11px] font-semibold tabular-nums sm:text-xs ${
                    today && day.isCurrentMonth
                      ? 'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white'
                      : day.isCurrentMonth
                        ? 'text-foreground'
                        : 'text-subtle'
                  }`}
                >
                  {day.dayNumber}
                </p>
                {dayShifts.length > 0 ? (
                  <div className="flex gap-0.5">
                    {counts.completed > 0 ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_META.completed.dot}`}
                        title={`${counts.completed} completed`}
                      />
                    ) : null}
                    {counts.scheduled > 0 ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_META.scheduled.dot}`}
                        title={`${counts.scheduled} scheduled`}
                      />
                    ) : null}
                    {counts.absent > 0 ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${STATUS_META.absent.dot}`}
                        title={`${counts.absent} absent`}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {dayShifts.length > 0 ? (
                <div className="mt-auto space-y-0.5">
                  {visibleShifts.map((shift) => (
                    <MonthShiftChip
                      key={shift.id}
                      shift={shift}
                      employeeNames={employeeNames}
                    />
                  ))}
                  {hiddenCount > 0 ? (
                    <p className="text-center text-[9px] font-medium text-subtle">
                      +{hiddenCount} more
                    </p>
                  ) : null}
                </div>
              ) : day.isCurrentMonth ? (
                <p className="mt-auto text-center text-[9px] text-zinc-700">—</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border px-4 py-3 sm:gap-4">
        {(Object.keys(STATUS_META) as ShiftStatus[]).map((status) => {
          const meta = STATUS_META[status];
          const Icon = meta.Icon;
          return (
            <span
              key={status}
              className="flex items-center gap-1.5 text-[11px] text-muted"
            >
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${meta.chip}`}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {meta.label}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
