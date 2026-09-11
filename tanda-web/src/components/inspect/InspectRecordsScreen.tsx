'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Box,
  CircleAlert,
  CircleCheck,
  Plus,
  TriangleAlert,
} from 'lucide-react';
import { InspectCargoCard } from '@/components/inspect/InspectCargoCard';
import { InspectStatCard } from '@/components/inspect/InspectStatCard';
import { WarehouseMixDonut } from '@/components/inspect/WarehouseMixDonut';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { useInspectionMediaQueue } from '@/hooks/useInspectionMediaQueue';
import {
  filterInspectionsByDateRange,
  getTodayInspectionRange,
} from '@/lib/inspections/filters';
import { formatFilterDate } from '@/lib/inspections/format';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { hasPendingInspectionUploads } from '@/lib/inspect/media-queue';
import { countInspections } from '@/lib/inspect/status-labels';
import { getRoleLabel } from '@/lib/auth/roles';
import { useInspectInspections } from '@/providers/InspectInspectionsProvider';
import { useInspectSession } from '@/providers/InspectSessionProvider';

export function InspectRecordsScreen() {
  const { user, role, employee, isInspectAdmin } = useInspectSession();
  const { inspections, loading, error } = useInspectInspections();
  const jobs = useInspectionMediaQueue();
  const uploading = hasPendingInspectionUploads(jobs);

  const todayRange = useMemo(() => getTodayInspectionRange(), []);
  const todayInspections = useMemo(
    () =>
      filterInspectionsByDateRange(
        inspections,
        todayRange.from,
        todayRange.to,
      ),
    [inspections, todayRange],
  );

  const counts = useMemo(
    () => countInspections(todayInspections),
    [todayInspections],
  );

  const todayLabel = formatFilterDate(todayRange.from);
  const greetingName =
    employee?.name?.trim() || user.email?.split('@')[0] || 'Operator';

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-normal tracking-wide text-foreground">
            Hi, {greetingName}
          </h1>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {INSPECT_BRAND.panelTitle}
          </p>
          <p className="mt-0.5 text-xs text-subtle">
            {role ? getRoleLabel(role) : 'Operator'}
            {isInspectAdmin ? ' · team view' : ''}
          </p>
        </div>

        <Link
          href="/inspect/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New
        </Link>
      </header>

      {uploading ? (
        <p className="mt-4 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs text-sky-200">
          Uploading evidence in the background. Keep this tab open until the
          progress bars finish.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <InspectStatCard
          title="In warehouse"
          value={counts.newCargo}
          icon={Box}
          tone="warehouse"
        />
        <InspectStatCard
          title="On truck"
          value={counts.loaded}
          icon={CircleCheck}
          tone="truck"
        />
        <InspectStatCard
          title="Requires attention"
          value={counts.requiresAttention}
          icon={CircleAlert}
          tone="attention"
        />
      </div>

      <div className="mt-4">
        <WarehouseMixDonut
          newCargo={counts.newCargo}
          loaded={counts.loaded}
        />
      </div>

      <section className="mt-6">
        <h2 className="font-display text-lg font-normal tracking-wide text-foreground">
          Today&apos;s inspections
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">
          {todayInspections.length > 0
            ? `${todayInspections.length} inspection${todayInspections.length === 1 ? '' : 's'} on ${todayLabel} · tap a card for details`
            : `No inspections recorded on ${todayLabel} yet`}
        </p>

        {error ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        {loading ? (
          <LoadingIndicator message="Loading inspections…" />
        ) : todayInspections.length === 0 ? (
          <EmptyState
            className="mt-4 py-12"
            icon={<Box className="h-10 w-10" aria-hidden />}
            title="No inspections today"
            description="Tap New to register a unit, or use Search to find inspections from other dates."
          />
        ) : (
          <ul className="mt-4 space-y-2.5">
            {todayInspections.map((inspection) => (
              <li key={inspection.id}>
                <InspectCargoCard inspection={inspection} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-[11px] leading-relaxed text-subtle">
        {INSPECT_BRAND.license}
      </p>
    </div>
  );
}
