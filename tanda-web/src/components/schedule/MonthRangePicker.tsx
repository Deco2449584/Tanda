'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftMonth } from '@/lib/schedule/month';

interface MonthRangePickerProps {
  referenceDate: Date;
  label: string;
  onChange: (next: Date) => void;
}

export function MonthRangePicker({
  referenceDate,
  label,
  onChange,
}: MonthRangePickerProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(referenceDate, -1))}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <span className="min-w-[140px] text-center text-sm font-medium capitalize text-zinc-200">
        {label}
      </span>

      <button
        type="button"
        onClick={() => onChange(shiftMonth(referenceDate, 1))}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
