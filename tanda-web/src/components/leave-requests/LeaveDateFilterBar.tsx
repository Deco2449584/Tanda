'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import type { DateRange } from '@/lib/attendance/date-range';

export type LeaveDatePreset = 'today' | 'lastWeek' | 'month' | 'custom';

interface LeaveDateFilterBarProps {
  dateRange: DateRange;
  activePreset: LeaveDatePreset;
  onPresetChange: (preset: LeaveDatePreset) => void;
  onRangeChange: (range: DateRange) => void;
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

export function LeaveDateFilterBar({
  dateRange,
  activePreset,
  onPresetChange,
  onRangeChange,
}: LeaveDateFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
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

      <DateRangePicker
        value={dateRange}
        onChange={(range) => {
          onRangeChange(range);
        }}
      />
    </div>
  );
}
