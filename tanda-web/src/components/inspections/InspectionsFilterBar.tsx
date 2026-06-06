'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import {
  getInspectionDateRangeForPreset,
  type InspectionDatePreset,
} from '@/lib/inspections/filters';
import { formatFilterDate } from '@/lib/inspections/format';

interface InspectionsFilterBarProps {
  datePreset: InspectionDatePreset;
  onDatePresetChange: (preset: InspectionDatePreset) => void;
  customFrom: Date;
  customTo: Date;
  onCustomFromChange: (date: Date) => void;
  onCustomToChange: (date: Date) => void;
  resultCount: number;
}

const PRESETS: { id: InspectionDatePreset; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
];

function presetButtonClass(isActive: boolean): string {
  return `rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
    isActive
      ? 'bg-primary text-white shadow-sm'
      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
  }`;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromInputDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function InspectionsFilterBar({
  datePreset,
  onDatePresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  resultCount,
}: InspectionsFilterBarProps) {
  const range = getInspectionDateRangeForPreset(
    datePreset,
    customFrom,
    customTo,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="inline-flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onDatePresetChange(preset.id)}
              className={presetButtonClass(datePreset === preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <DateRangePicker
            value={{ start: toInputDate(customFrom), end: toInputDate(customTo) }}
            onChange={(rangeValue) => {
              onCustomFromChange(fromInputDate(rangeValue.start));
              onCustomToChange(fromInputDate(rangeValue.end));
            }}
          />
        )}
      </div>

      <p className="text-sm text-zinc-500">
        {formatFilterDate(range.from)} – {formatFilterDate(range.to)} ·{' '}
        {resultCount} inspection{resultCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}
