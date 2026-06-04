'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import {
  formatPayPeriodLabel,
  getCurrentWeekDateRange,
  getLastWeekRange,
  type DateRange,
} from '@/lib/attendance/date-range';

export type AttendanceDatePreset = 'thisWeek' | 'lastWeek' | 'custom';

interface AttendanceDateFilterBarProps {
  dateRange: DateRange;
  activePreset: AttendanceDatePreset;
  onPresetChange: (preset: AttendanceDatePreset) => void;
  onRangeChange: (range: DateRange) => void;
}

const PRESETS: { id: AttendanceDatePreset; label: string }[] = [
  { id: 'thisWeek', label: 'This week' },
  { id: 'lastWeek', label: 'Last week' },
];

function presetButtonClass(isActive: boolean): string {
  return `rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
    isActive
      ? 'bg-primary text-white shadow-sm'
      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
  }`;
}

export function AttendanceDateFilterBar({
  dateRange,
  activePreset,
  onPresetChange,
  onRangeChange,
}: AttendanceDateFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <div className="inline-flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              onPresetChange(preset.id);
              onRangeChange(
                preset.id === 'thisWeek'
                  ? getCurrentWeekDateRange()
                  : getLastWeekRange(),
              );
            }}
            className={presetButtonClass(activePreset === preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <DateRangePicker
          value={dateRange}
          onChange={(range) => {
            onPresetChange('custom');
            onRangeChange(range);
          }}
        />
        <p className="text-xs text-zinc-500">
          Payroll period: {formatPayPeriodLabel(dateRange)}
        </p>
      </div>
    </div>
  );
}
