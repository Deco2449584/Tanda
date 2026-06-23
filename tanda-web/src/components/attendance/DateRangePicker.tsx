'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import {
  formatDateRangeLabel,
  getDefaultDateRange,
  isValidDateRange,
  type DateRange,
} from '@/lib/attendance/date-range';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setDraft(value);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, value]);

  function handleApply() {
    if (!isValidDateRange(draft)) {
      window.alert('Start date must be on or before the end date.');
      return;
    }

    onChange(draft);
    setOpen(false);
  }

  function handleReset() {
    const defaultRange = getDefaultDateRange();
    setDraft(defaultRange);
    onChange(defaultRange);
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm text-foreground transition-colors hover:border-zinc-600"
        aria-expanded={open}
      >
        <CalendarRange className="h-4 w-4 text-primary" />
        {formatDateRangeLabel(value)}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface-raised p-4 shadow-2xl">
          <p className="mb-3 text-xs font-medium text-muted">
            Date range
          </p>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-subtle">From</span>
              <input
                type="date"
                value={draft.start}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, start: e.target.value }))
                }
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-subtle">To</span>
              <input
                type="date"
                value={draft.end}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, end: e.target.value }))
                }
                className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border border-border-strong py-2 text-xs font-medium text-muted hover:bg-surface-hover"
            >
              This week
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded-lg bg-primary py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
