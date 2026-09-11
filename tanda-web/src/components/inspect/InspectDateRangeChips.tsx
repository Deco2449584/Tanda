'use client';

import { Input } from '@/components/ui/Input';
import type { InspectionDatePreset } from '@/lib/inspections/filters';

const PRESETS: { id: InspectionDatePreset; label: string }[] = [
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
];

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromInputDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

interface InspectDateRangeChipsProps {
  preset: InspectionDatePreset;
  onPresetChange: (preset: InspectionDatePreset) => void;
  customFrom: Date;
  customTo: Date;
  onCustomFromChange: (date: Date) => void;
  onCustomToChange: (date: Date) => void;
}

export function InspectDateRangeChips({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
}: InspectDateRangeChipsProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Date range</p>
      <p className="mt-0.5 text-xs text-subtle">
        Filter records by when they were registered
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((item) => {
          const active = item.id === preset;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onPresetChange(item.id)}
              aria-pressed={active}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                active
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border-strong bg-surface-raised text-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {preset === 'custom' ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground">
              From
            </span>
            <Input
              type="date"
              value={toInputDate(customFrom)}
              max={toInputDate(customTo)}
              onChange={(event) => {
                if (event.target.value) {
                  onCustomFromChange(fromInputDate(event.target.value));
                }
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-foreground">
              To
            </span>
            <Input
              type="date"
              value={toInputDate(customTo)}
              min={toInputDate(customFrom)}
              onChange={(event) => {
                if (event.target.value) {
                  onCustomToChange(fromInputDate(event.target.value));
                }
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
