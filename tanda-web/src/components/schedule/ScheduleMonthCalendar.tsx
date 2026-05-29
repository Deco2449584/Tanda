'use client';

import { useMemo } from 'react';
import { isToday, parseISO } from 'date-fns';
import { normalizeInputDate } from '@/lib/dates/input-date';
import type { CalendarDayCell } from '@/lib/schedule/month';
import type { Shift } from '@/lib/types/shift';

const STATUS_BAR_CLASS: Record<Shift['status'], string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-emerald-500',
  absent: 'bg-orange-500',
};

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface ScheduleMonthCalendarProps {
  days: CalendarDayCell[];
  shifts: Shift[];
  loading: boolean;
  monthLabel: string;
}

export function ScheduleMonthCalendar({
  days,
  shifts,
  loading,
  monthLabel,
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
        <p className="text-sm text-zinc-400">Cargando calendario mensual...</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
      <div className="border-b border-zinc-800 bg-emerald-950/30 px-4 py-3">
        <h2 className="text-sm font-semibold capitalize text-emerald-100">
          {monthLabel}
        </h2>
      </div>

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
              className={`min-h-[88px] border-b border-r border-zinc-800/60 p-1.5 last:border-r-0 ${
                day.isCurrentMonth ? 'bg-zinc-950/20' : 'bg-zinc-950/5 opacity-50'
              }`}
            >
              <p
                className={`mb-1 text-right text-xs font-medium ${
                  today
                    ? 'inline-flex ml-auto rounded-full bg-emerald-600 px-1.5 text-white'
                    : day.isCurrentMonth
                      ? 'text-zinc-300'
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
          <span className="h-1.5 w-6 rounded-full bg-blue-500" />
          Programado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-emerald-500" />
          Finalizado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-6 rounded-full bg-orange-500" />
          Ausente
        </span>
      </div>
    </div>
  );
}
