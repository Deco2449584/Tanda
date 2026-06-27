'use client';

import { LayoutDashboard, MapPin, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import { Button } from '@/components/ui/Button';
import type { DateRange } from '@/lib/attendance/date-range';
import {
  formatDateRangeLabel,
  getCurrentMonthRange,
  getCurrentWeekDateRange,
  getLast30DaysRange,
  getLast7DaysRange,
  getTodayRange,
} from '@/lib/attendance/date-range';
import { buildWeekRange, shiftWeek } from '@/lib/schedule/week';

export type DashboardPeriodPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_7'
  | 'last_30'
  | 'custom';

interface LocationOption {
  id: string;
  label: string;
}

interface DashboardFiltersBarProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  periodPreset: DashboardPeriodPreset;
  onPeriodPresetChange: (preset: DashboardPeriodPreset) => void;
  locationFilter: string;
  onLocationFilterChange: (locationId: string) => void;
  locationOptions: LocationOption[];
  onCustomize: () => void;
  onResetLayout: () => void;
}

const PRESET_OPTIONS: Array<{ id: DashboardPeriodPreset; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_7', label: 'Last 7 days' },
  { id: 'last_30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom' },
];

function resolvePresetRange(preset: DashboardPeriodPreset): DateRange {
  switch (preset) {
    case 'today':
      return getTodayRange();
    case 'this_week':
      return getCurrentWeekDateRange();
    case 'this_month':
      return getCurrentMonthRange();
    case 'last_7':
      return getLast7DaysRange();
    case 'last_30':
      return getLast30DaysRange();
    default:
      return getCurrentWeekDateRange();
  }
}

function shiftRangeByWeek(range: DateRange, direction: -1 | 1): DateRange {
  const reference = new Date(`${range.start}T12:00:00`);
  const week = buildWeekRange(shiftWeek(reference, direction));
  return { start: week.start, end: week.end };
}

export function DashboardFiltersBar({
  dateRange,
  onDateRangeChange,
  periodPreset,
  onPeriodPresetChange,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  onCustomize,
  onResetLayout,
}: DashboardFiltersBarProps) {
  function handlePresetChange(preset: DashboardPeriodPreset) {
    onPeriodPresetChange(preset);
    if (preset !== 'custom') {
      onDateRangeChange(resolvePresetRange(preset));
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-raised/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LayoutDashboard className="h-4 w-4 text-primary" aria-hidden />
          Dashboard filters
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCustomize}>
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Customize widgets
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onResetLayout}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset layout
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetChange(preset.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              periodPreset === preset.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-surface text-muted hover:text-foreground'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {periodPreset === 'custom' ? (
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            onStepWeek={(direction) =>
              onDateRangeChange(shiftRangeByWeek(dateRange, direction))
            }
          />
        ) : (
          <p className="text-sm text-muted">{formatDateRangeLabel(dateRange)}</p>
        )}

        <div className="relative w-full sm:min-w-[240px] sm:max-w-xs">
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <select
            value={locationFilter}
            onChange={(event) => onLocationFilterChange(event.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-surface py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            aria-label="Filter by location"
          >
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id} className="bg-surface-raised">
                {location.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
