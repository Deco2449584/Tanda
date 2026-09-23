'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ClipboardCheck,
  Download,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { InspectionCard } from '@/components/inspections/InspectionCard';
import { InspectionsFilterBar } from '@/components/inspections/InspectionsFilterBar';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useInspectionsAccess } from '@/hooks/useInspectionsAccess';
import { useInspectionMediaQueue } from '@/hooks/useInspectionMediaQueue';
import { exportInspectionsToCsv } from '@/lib/inspections/export-inspections-csv';
import {
  filterInspectionsByDateRange,
  filterInspectionsBySearch,
  getInspectionDateRangeForPreset,
  getTodayInspectionRange,
  type InspectionDatePreset,
} from '@/lib/inspections/filters';
import {
  hasPendingInspectionUploads,
  retryInspectionMediaJob,
} from '@/lib/inspections/media-queue';
import { resolveInspectionStatus } from '@/lib/inspections/status';
import { useCargoInspections } from '@/providers/CargoInspectionsProvider';

export function InspectionsPageClient() {
  const { inspections, loading, error, refresh } = useCargoInspections();
  const { canRead, canCreate } = useInspectionsAccess();
  const mediaJobs = useInspectionMediaQueue();
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
        const status = resolveInspectionStatus(inspection);
        if (status === 'identification') acc.identification += 1;
        if (status === 'processed') acc.processed += 1;
        if (status === 'loaded') acc.loaded += 1;
        if (inspection.hasIssues) acc.requiresAttention += 1;
        return acc;
      },
      { identification: 0, processed: 0, loaded: 0, requiresAttention: 0 },
    );
  }, [inspections]);

  const pendingUploads = useMemo(
    () => hasPendingInspectionUploads(mediaJobs),
    [mediaJobs],
  );
  const failedJobs = useMemo(
    () => mediaJobs.filter((job) => job.status === 'error'),
    [mediaJobs],
  );
  const activeJobs = useMemo(
    () =>
      mediaJobs.filter(
        (job) =>
          job.status === 'queued' ||
          job.status === 'compressing' ||
          job.status === 'uploading',
      ),
    [mediaJobs],
  );
  const uploadProgress = useMemo(() => {
    if (activeJobs.length === 0) return 0;
    return Math.round(
      activeJobs.reduce((sum, job) => sum + job.progress, 0) / activeJobs.length,
    );
  }, [activeJobs]);

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
        description="ULD / AWB warehouse intake records — shared with the Continental Inspect mobile app."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate ? (
              <Link
                href="/inspections/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Register new
              </Link>
            ) : null}
            <RefreshButton onClick={refresh} refreshing={loading} />
          </div>
        }
        stats={[
          { label: 'Identification', value: todayStats.identification },
          { label: 'Processed', value: todayStats.processed },
          { label: 'On truck', value: todayStats.loaded },
          {
            label: 'Issues',
            value: todayStats.requiresAttention,
            accent: todayStats.requiresAttention > 0,
          },
        ]}
      />

      {pendingUploads || failedJobs.length > 0 ? (
        <div
          className={`rounded-xl border px-4 py-3 ${
            failedJobs.length > 0
              ? 'border-amber-500/40 bg-amber-950/25'
              : 'border-primary/30 bg-primary/10'
          }`}
          role="status"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                {failedJobs.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-amber-300" aria-hidden />
                ) : (
                  <Upload className="h-4 w-4 text-primary" aria-hidden />
                )}
                {failedJobs.length > 0
                  ? `${failedJobs.length} evidence upload${failedJobs.length === 1 ? '' : 's'} failed`
                  : `Uploading evidence (${activeJobs.length})`}
              </p>
              {pendingUploads ? (
                <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-surface-base">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.max(4, uploadProgress)}%` }}
                  />
                </div>
              ) : null}
              <p className="mt-1.5 text-xs text-muted">
                {failedJobs.length > 0
                  ? 'The inspection is saved. These files are still in this browser. Tap Retry failed. If you close the tab, attach the files again from the record.'
                  : 'The inspection is saved. Keep this tab open until the files finish uploading. If the connection drops, wait here and it will continue.'}
              </p>
            </div>
            {failedJobs.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  failedJobs.forEach((job) => retryInspectionMediaJob(job.id));
                }}
                className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
              >
                Retry failed
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

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
          disabled={loading || !canRead || filteredInspections.length === 0}
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
