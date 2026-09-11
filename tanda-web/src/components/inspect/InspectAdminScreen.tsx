'use client';

import { useMemo, useState } from 'react';
import { Database, Download, ShieldCheck } from 'lucide-react';
import { InspectDateRangeChips } from '@/components/inspect/InspectDateRangeChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { exportInspectionsToCsv } from '@/lib/inspections/export-inspections-csv';
import {
  filterInspectionsByDateRange,
  getInspectionDateRangeForPreset,
  getWeekInspectionRange,
  type InspectionDatePreset,
} from '@/lib/inspections/filters';
import { useInspectInspections } from '@/providers/InspectInspectionsProvider';
import { useInspectSession } from '@/providers/InspectSessionProvider';

export function InspectAdminScreen() {
  const { isInspectAdmin } = useInspectSession();
  const { inspections } = useInspectInspections();
  const initialRange = useMemo(() => getWeekInspectionRange(), []);

  const [preset, setPreset] = useState<InspectionDatePreset>('week');
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [message, setMessage] = useState('');

  const range = useMemo(
    () => getInspectionDateRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const inRange = useMemo(
    () => filterInspectionsByDateRange(inspections, range.from, range.to),
    [inspections, range],
  );

  if (!isInspectAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-5">
        <EmptyState
          icon={<ShieldCheck className="h-10 w-10" aria-hidden />}
          title="Admin access required"
          description="Only Continental Inspect admins can export cargo reports."
        />
      </div>
    );
  }

  function handleExport() {
    setMessage('');
    const exported = exportInspectionsToCsv(inRange, range);
    setMessage(
      exported
        ? 'CSV export started.'
        : 'No inspections in the selected date range.',
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>

      <h1 className="mt-3 font-display text-xl font-normal tracking-wide text-foreground">
        Admin panel
      </h1>
      <p className="mt-1 text-[13px] text-muted">
        Export cargo inspections. Filter by date before downloading.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Database className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-2xl font-semibold tabular-nums text-primary">
          {inRange.length}
        </p>
        <p className="text-xs text-subtle">
          Inspections in range ({inspections.length} total)
        </p>
      </div>

      <div className="mt-6">
        <InspectDateRangeChips
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-foreground">
        Download reports
      </h2>

      <button
        type="button"
        onClick={handleExport}
        className="mt-3 flex w-full items-center gap-3 rounded-xl bg-primary px-4 py-3.5 text-left text-white transition hover:bg-primary/90"
      >
        <Download className="h-5 w-5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Export CSV Report</span>
          <span className="block text-xs text-white/80">
            {inRange.length} inspection{inRange.length === 1 ? '' : 's'} in
            selected date range
          </span>
        </span>
      </button>

      {message ? (
        <p className="mt-3 text-center text-xs text-subtle">{message}</p>
      ) : null}
    </div>
  );
}
