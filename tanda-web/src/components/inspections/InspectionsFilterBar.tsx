'use client';

import { DateRangePicker } from '@/components/attendance/DateRangePicker';
import {
  getInspectionDateRangeForPreset,
  type InspectionDatePreset,
  type InspectionFilterOption,
} from '@/lib/inspections/filters';
import { formatFilterDate } from '@/lib/inspections/format';

interface InspectionsFilterBarProps {
  datePreset: InspectionDatePreset;
  onDatePresetChange: (preset: InspectionDatePreset) => void;
  customFrom: Date;
  customTo: Date;
  onCustomFromChange: (date: Date) => void;
  onCustomToChange: (date: Date) => void;
  clientOptions: InspectionFilterOption[];
  clientId: string;
  onClientIdChange: (clientId: string) => void;
  employeeOptions: InspectionFilterOption[];
  employeeId: string;
  onEmployeeIdChange: (employeeId: string) => void;
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
      : 'border border-border-strong bg-surface-raised text-muted hover:border-zinc-500 hover:text-foreground'
  }`;
}

function selectClassName(): string {
  return 'h-10 w-full min-w-[10rem] rounded-lg border border-border-strong bg-surface-raised px-3 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 sm:w-auto sm:min-w-[12rem]';
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
  clientOptions,
  clientId,
  onClientIdChange,
  employeeOptions,
  employeeId,
  onEmployeeIdChange,
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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Client
          </span>
          <select
            value={clientId}
            onChange={(event) => onClientIdChange(event.target.value)}
            className={selectClassName()}
            aria-label="Filter by client"
          >
            <option value="">All clients</option>
            {clientOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Employee
          </span>
          <select
            value={employeeId}
            onChange={(event) => onEmployeeIdChange(event.target.value)}
            className={selectClassName()}
            aria-label="Filter by employee"
          >
            <option value="">All employees</option>
            {employeeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-subtle">
        {formatFilterDate(range.from)} – {formatFilterDate(range.to)} ·{' '}
        {resultCount} inspection{resultCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}
