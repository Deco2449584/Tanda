'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { InspectCargoCard } from '@/components/inspect/InspectCargoCard';
import { InspectDateRangeChips } from '@/components/inspect/InspectDateRangeChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  filterInspectionsByDateRange,
  filterInspectionsBySearch,
  getInspectionDateRangeForPreset,
  getWeekInspectionRange,
  type InspectionDatePreset,
} from '@/lib/inspections/filters';
import { formatFilterDate } from '@/lib/inspections/format';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { useInspectInspections } from '@/providers/InspectInspectionsProvider';

export function InspectSearchScreen() {
  const { inspections, loading } = useInspectInspections();
  const initialRange = useMemo(() => getWeekInspectionRange(), []);

  const [preset, setPreset] = useState<InspectionDatePreset>('week');
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [searchQuery, setSearchQuery] = useState('');

  const range = useMemo(
    () => getInspectionDateRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const results = useMemo(
    () =>
      filterInspectionsBySearch(
        filterInspectionsByDateRange(inspections, range.from, range.to),
        searchQuery,
      ),
    [inspections, range, searchQuery],
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
      <h1 className="font-display text-xl font-normal tracking-wide text-foreground">
        Advanced search
      </h1>
      <p className="mt-0.5 text-[13px] text-muted">
        {INSPECT_BRAND.panelTitle} · Filter by date, ULD or AWB
      </p>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
          aria-hidden
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by ULD serial or AWB…"
          aria-label="Search inspections"
          className="h-11 pl-9"
        />
      </div>

      <div className="mt-5">
        <InspectDateRangeChips
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      <p className="mt-5 text-xs text-subtle">
        {formatFilterDate(range.from)} – {formatFilterDate(range.to)}
      </p>
      <h2 className="mt-1 font-display text-lg font-normal tracking-wide text-foreground">
        {results.length} inspection{results.length === 1 ? '' : 's'}
      </h2>

      {loading ? (
        <LoadingIndicator message="Loading inspections…" />
      ) : results.length === 0 ? (
        <EmptyState
          className="mt-4 py-12"
          icon={<Search className="h-10 w-10" aria-hidden />}
          title="No inspections found"
          description="Try another date range or search by ULD serial or AWB number."
        />
      ) : (
        <ul className="mt-4 space-y-2.5">
          {results.map((inspection) => (
            <li key={inspection.id}>
              <InspectCargoCard inspection={inspection} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
