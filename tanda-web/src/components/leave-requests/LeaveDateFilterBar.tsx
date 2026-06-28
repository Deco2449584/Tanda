'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import type { DateRange } from '@/lib/attendance/date-range';
import { getCurrentMonthRange } from '@/lib/attendance/date-range';
import { buildWeekRange, shiftWeek } from '@/lib/schedule/week';

export type LeaveDatePreset = 'today' | 'lastWeek' | 'month' | 'custom';

interface LeaveDateFilterBarProps {
  dateRange: DateRange;
  activePreset: LeaveDatePreset;
  onPresetChange: (preset: LeaveDatePreset) => void;
  onRangeChange: (range: DateRange) => void;
  onStepRange: (direction: -1 | 1) => void;
}

const PRESETS: { id: LeaveDatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'lastWeek', label: 'Last week' },
  { id: 'month', label: 'Month' },
];

function presetButtonClass(isActive: boolean): string {
  return `rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
    isActive
      ? 'bg-primary text-white shadow-sm'
      : 'border border-border-strong bg-surface-raised text-muted hover:border-zinc-500 hover:text-foreground'
  }`;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLeaveDateRange(
  range: DateRange,
  preset: LeaveDatePreset,
  direction: -1 | 1,
): DateRange {
  const reference = new Date(`${range.start}T12:00:00`);

  if (preset === 'today') {
    reference.setDate(reference.getDate() + direction);
    const day = toInputDate(reference);
    return { start: day, end: day };
  }

  if (preset === 'month') {
    return getCurrentMonthRange(
      new Date(reference.getFullYear(), reference.getMonth() + direction, 15),
    );
  }

  if (preset === 'lastWeek' || preset === 'custom') {
    const week = buildWeekRange(shiftWeek(reference, direction));
    return { start: week.start, end: week.end };
  }

  const week = buildWeekRange(shiftWeek(reference, direction));
  return { start: week.start, end: week.end };
}

export function LeaveDateFilterBar({
  dateRange,
  activePreset,
  onPresetChange,
  onRangeChange,
  onStepRange,
}: LeaveDateFilterBarProps) {
  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="inline-flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPresetChange(preset.id)}
            className={presetButtonClass(activePreset === preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="w-full min-w-0 lg:w-auto">
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            onRangeChange(range);
          }}
          onStepWeek={(direction) => {
            onStepRange(direction);
          }}
        />
      </div>
    </div>
  );
}
