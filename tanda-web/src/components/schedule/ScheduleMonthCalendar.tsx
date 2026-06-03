'use client';

import { useMemo } from 'react';
import { isToday, parseISO } from 'date-fns';
import { normalizeInputDate } from '@/lib/dates/input-date';
import type { CalendarDayCell } from '@/lib/schedule/month';
import type { Shift } from '@/lib/types/shift';

const STATUS_BAR_CLASS: Record<Shift['status'], string> = {
  scheduled: 'bg-primary',
  completed: 'bg-emerald-500',
  absent: 'bg-orange-500',
};

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ScheduleMonthCalendarProps {
  days: CalendarDayCell[];
  shifts: Shift[];
  loading: boolean;
  monthLabel: string;
  onDayClick?: (date: string) => void;
}

export function ScheduleMonthCalendar({
  days,
  shifts,
  loading,
  monthLabel,
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
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60">
        <p className="text-sm text-zinc-400">Loading monthly calendar...</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
      <div className="border-b border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <h2 className="text-sm font-semibold capitalize text-white">
          {monthLabel}
        </h2>
        {onDayClick ? (
          <p className="mt-0.5 text-xs text-zinc-500">
            Click a day to assign a shift
          </p>
        ) : null}
      </div>

      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="min-w-[640px]">
      <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-950/50">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="border-r border-zinc-800/60 px-1 py-2 text-center text-[11px] font-semibold uppercase text-zinc-500 last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayShifts = shiftsByDate.get(normalizeInputDate(day.date)) ?? [];
          const today = isToday(parseISO(`${day.date}T12:00:00`));

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
              className={`min-h-[88px] border-b border-r border-zinc-800/60 p-1.5 last:border-r-0 ${
                day.isCurrentMonth
                  ? onDayClick
                    ? 'cursor-pointer bg-zinc-950/20 transition-colors hover:bg-zinc-800/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary/40'
                    : 'bg-zinc-950/20'
                  : 'bg-zinc-950/5 opacity-50'
              }`}
            >
              <p
                className={`mb-1 text-right text-xs font-medium ${
                  today
                    ? 'ml-auto inline-flex rounded-full bg-primary px-1.5 text-white'
                    : day.isCurrentMonth
                      ? 'text-zinc-200'
                      : 'text-zinc-600'
                }`}
              >
                {day.dayNumber}
              </p>

              <div className="space-y-0.5">
                {dayShifts.slice(0, 6).map((shift) => (
                  <div
                    key={shift.id}
                    className={`h-1.5 w-full rounded-full ${STATUS_BAR_CLASS[shift.status]}`}
                    title={`${shift.employeeId} · ${shift.department} · ${shift.startTime}-${shift.endTime}`}
                  />
                ))}
                {dayShifts.length > 6 && (
                  <p className="text-[9px] text-zinc-500">+{dayShifts.length - 6}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-zinc-800 px-4 py-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-primary" />
          Scheduled
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-emerald-500" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-orange-500" />
          Absent
        </span>
      </div>
        </div>
      </div>
    </div>
  );
}
