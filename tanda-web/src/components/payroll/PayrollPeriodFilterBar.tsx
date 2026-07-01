'use client';

import type { ReactNode } from 'react';
import { AttendanceDateFilterBar } from '@/components/attendance/AttendanceDateFilterBar';
import {
  getCurrentWeekDateRange,
  getLastWeekRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { cn } from '@/lib/cn';

export type PayrollPeriodPreset = 'this-week' | 'last-week' | 'custom';

interface PayrollPeriodFilterBarProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset: PayrollPeriodPreset;
  onPresetChange: (preset: PayrollPeriodPreset) => void;
  actions?: ReactNode;
}

const PRESETS: Array<{ id: PayrollPeriodPreset; label: string }> = [
  { id: 'this-week', label: 'This week' },
  { id: 'last-week', label: 'Last week' },
  { id: 'custom', label: 'Custom' },
];

export function PayrollPeriodFilterBar({
  dateRange,
  onDateRangeChange,
  preset,
  onPresetChange,
  actions,
}: PayrollPeriodFilterBarProps) {
  function applyPreset(nextPreset: PayrollPeriodPreset) {
    onPresetChange(nextPreset);
    if (nextPreset === 'this-week') {
      onDateRangeChange(getCurrentWeekDateRange());
      return;
    }
    if (nextPreset === 'last-week') {
      onDateRangeChange(getLastWeekRange());
    }
  }

  function handleRangeChange(range: DateRange) {
    onPresetChange('custom');
    onDateRangeChange(range);
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => applyPreset(item.id)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              preset === item.id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <AttendanceDateFilterBar
          dateRange={dateRange}
          onRangeChange={handleRangeChange}
        />
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
