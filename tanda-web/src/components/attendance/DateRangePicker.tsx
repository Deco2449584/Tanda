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
      window.alert('La fecha de inicio debe ser anterior o igual a la fecha fin.');
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
        className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-200 transition-colors hover:border-zinc-600"
        aria-expanded={open}
      >
        <CalendarRange className="h-4 w-4 text-emerald-500" />
        {formatDateRangeLabel(value)}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-800 bg-zinc-900 p-4 shadow-2xl">
          <p className="mb-3 text-xs font-medium text-zinc-400">
            Rango de fechas
          </p>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Desde</span>
              <input
                type="date"
                value={draft.start}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, start: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-600"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Hasta</span>
              <input
                type="date"
                value={draft.end}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, end: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-lg border border-zinc-700 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
