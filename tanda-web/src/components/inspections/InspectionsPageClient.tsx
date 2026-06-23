'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Package, Search, Truck } from 'lucide-react';
import { InspectionCard } from '@/components/inspections/InspectionCard';
import { InspectionsFilterBar } from '@/components/inspections/InspectionsFilterBar';
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

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  tone: 'sky' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'sky'
      ? 'border-sky-500/30 bg-sky-950/20 text-sky-300'
      : tone === 'emerald'
        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
        : 'border-amber-500/30 bg-amber-950/20 text-amber-300';

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className="h-5 w-5 opacity-80" aria-hidden />
      </div>
    </article>
  );
}

export function InspectionsPageClient() {
  const { inspections, loading, error } = useCargoInspections();
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
      <div>
        <h1 className="text-base font-bold tracking-wide text-white uppercase">
          Cargo inspections
        </h1>
        <p className="mt-1 text-sm text-subtle">
          ULD / AWB records from Continental Inspect — same data as the mobile app.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="New today"
          value={todayStats.newCargo}
          icon={Package}
          tone="sky"
        />
        <StatCard
          label="Loaded today"
          value={todayStats.loaded}
          icon={Truck}
          tone="emerald"
        />
        <StatCard
          label="Requires attention"
          value={todayStats.requiresAttention}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

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
        <p className="text-sm text-subtle">Loading inspections...</p>
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
