'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Download, Plus, Search } from 'lucide-react';
import { InspectionCard } from '@/components/inspections/InspectionCard';
import { InspectionsFilterBar } from '@/components/inspections/InspectionsFilterBar';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { exportInspectionsToCsv } from '@/lib/inspections/export-inspections-csv';
import {
  filterInspectionsByDateRange,
  filterInspectionsBySearch,
  getInspectionDateRangeForPreset,
  getTodayInspectionRange,
  type InspectionDatePreset,
} from '@/lib/inspections/filters';
import { resolveInspectionStatus } from '@/lib/inspections/status';
import { useCargoInspections } from '@/providers/CargoInspectionsProvider';

export function InspectionsPageClient() {
  const { inspections, loading, error, refresh } = useCargoInspections();
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<InspectionDatePreset>('week');
  const [customFrom, setCustomFrom] = useState(() => new Date());
  const [customTo, setCustomTo] = useState(() => new Date());

  const activeRange = useMemo(
    () => getInspectionDateRangeForPreset(datePreset, customFrom, customTo),
    [customFrom, customTo, datePreset],
  );

  const filteredInspections = useMemo(() => {
    return filterInspectionsBySearch(
      filterInspectionsByDateRange(inspections, activeRange.from, activeRange.to),
      searchQuery,
    );
  }, [activeRange.from, activeRange.to, inspections, searchQuery]);

  const todayStats = useMemo(() => {
    const { from, to } = getTodayInspectionRange();
    const today = filterInspectionsByDateRange(inspections, from, to);

    return today.reduce(
      (acc, inspection) => {
        if (resolveInspectionStatus(inspection) === 'new') {
          acc.newCargo += 1;
        }
        if (resolveInspectionStatus(inspection) === 'loaded') {
          acc.loaded += 1;
        }
        if (inspection.hasIssues) {
          acc.requiresAttention += 1;
        }
        return acc;
      },
      { newCargo: 0, loaded: 0, requiresAttention: 0 },
    );
  }, [inspections]);

  function handleExportCsv() {
    const exported = exportInspectionsToCsv(filteredInspections, activeRange);
    if (!exported) {
      window.alert('No inspections to export for the current filters.');
    }
  }

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <PageHeader
        eyebrow="Compliance"
        eyebrowIcon={ClipboardCheck}
        title="Cargo inspections"
        description="ULD / AWB records from Continental Inspect — same data as the mobile app."
        actions={
          <>
            <Link
              href="/inspect/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New inspection
            </Link>
            <RefreshButton onClick={refresh} refreshing={loading} />
          </>
        }
        stats={[
          { label: 'New today', value: todayStats.newCargo },
          { label: 'Loaded today', value: todayStats.loaded },
          {
            label: 'Attention',
            value: todayStats.requiresAttention,
            accent: todayStats.requiresAttention > 0,
          },
        ]}
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search ULD, AWB, or food type..."
            className="w-full rounded-xl border border-border bg-surface-raised py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-subtle outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || filteredInspections.length === 0}
          title="Export filtered inspections (CSV)"
          aria-label="Export filtered inspections CSV"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-border-strong bg-surface-raised px-4 text-sm font-medium text-muted transition-colors hover:border-zinc-500 hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 lg:self-auto"
        >
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
          Export CSV
        </button>
      </div>

      <InspectionsFilterBar
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        resultCount={filteredInspections.length}
      />

      {error && !loading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <LoadingIndicator />
      ) : filteredInspections.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface-raised px-4 py-10 text-center text-sm text-muted">
          No inspections match the current filters.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredInspections.map((inspection) => (
            <InspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </div>
  );
}
