'use client';

import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { buildWeekRange, formatWeekRangeLabel, shiftWeek } from '@/lib/schedule/week';

interface WeekRangePickerProps {
  referenceDate: Date;
  onChange: (date: Date) => void;
  fullWidth?: boolean;
}

export function WeekRangePicker({
  referenceDate,
  onChange,
  fullWidth = false,
}: WeekRangePickerProps) {
  const week = buildWeekRange(referenceDate);

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-border bg-surface-raised ${
        fullWidth ? 'w-full justify-between px-1 py-1' : 'inline-flex gap-2 px-2 py-1.5'
      }`}
    >
      <button
        type="button"
        onClick={() => onChange(shiftWeek(referenceDate, -1))}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        className={`flex min-w-0 items-center justify-center gap-2 text-foreground ${
          fullWidth ? 'flex-1 px-1 text-xs font-medium' : 'px-2 text-sm'
        }`}
      >
        <CalendarRange
          className={`shrink-0 text-primary ${fullWidth ? 'h-3.5 w-3.5' : 'h-4 w-4'}`}
        />
        <span className="truncate">{formatWeekRangeLabel(week)}</span>
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftWeek(referenceDate, 1))}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
