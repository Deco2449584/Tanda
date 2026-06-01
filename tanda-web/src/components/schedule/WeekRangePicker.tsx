'use client';

import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildWeekRange, formatWeekRangeLabel, shiftWeek } from '@/lib/schedule/week';

interface WeekRangePickerProps {
  referenceDate: Date;
  onChange: (date: Date) => void;
}

export function WeekRangePicker({ referenceDate, onChange }: WeekRangePickerProps) {
  const week = buildWeekRange(referenceDate);

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-2 py-1.5">
      <button
        type="button"
        onClick={() => onChange(shiftWeek(referenceDate, -1))}
        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 px-2 text-sm text-zinc-200">
        <CalendarRange className="h-4 w-4 text-blue-500" />
        {formatWeekRangeLabel(week)}
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftWeek(referenceDate, 1))}
        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
