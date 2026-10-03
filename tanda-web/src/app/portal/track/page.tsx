'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
  LogOut,
  RefreshCw,
  ScanSearch,
  Search,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { PortalHeroPhoto } from '@/components/portal/PortalHeroPhoto';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { PortalInspectionCard } from '@/components/portal/PortalInspectionCard';
import { PortalAuthGuard } from '@/components/portal/PortalAuthGuard';
import {
  fetchPortalInspectionsList,
  type PortalInspectionSummary,
} from '@/lib/portal/client-api';
import { normalizeInspectionStatus } from '@/lib/inspections/status';
import {
  clearPortalSession,
  getPortalAwb,
  getPortalClientName,
  getPortalKind,
} from '@/lib/portal/client-session';

const POLL_MS = 60_000;

type StatusFilter = 'all' | 'identification' | 'processed' | 'loaded';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'identification', label: 'Identification' },
  { id: 'processed', label: 'Processed' },
  { id: 'loaded', label: 'On truck' },
];

export default function PortalTrackPage() {
  return (
    <PortalAuthGuard>
      <PortalTrackContent />
    </PortalAuthGuard>
  );
}

function PortalTrackContent() {
  const router = useRouter();
  const [kind, setKind] = useState<'awb' | 'account'>(getPortalKind);
  const [awbNumber, setAwbNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [inspections, setInspections] = useState<PortalInspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const data = await fetchPortalInspectionsList();
      setKind(data.kind);
      setAwbNumber(data.awbNumber);
      setClientName(data.clientName);
      setInspections(data.inspections);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load inspections.';
      if (
        message.includes('Session') ||
        message.includes('Unauthorized') ||
        message.includes('expired')
      ) {
        clearPortalSession();
        router.replace('/portal');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    setKind(getPortalKind());
    setAwbNumber(getPortalAwb() ?? '');
    setClientName(getPortalClientName());
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void load(true);
    }, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  function handleSignOut() {
    clearPortalSession();
    router.replace('/portal');
  }

  const searchedInspections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inspections;
    return inspections.filter((item) => {
      const haystack = [item.awbNumber, item.uldId, item.foodType]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [inspections, searchQuery]);

  const visibleInspections = useMemo(() => {
    if (statusFilter === 'all') return searchedInspections;
    return searchedInspections.filter(
      (item) => normalizeInspectionStatus(item.status) === statusFilter,
    );
  }, [searchedInspections, statusFilter]);

  const identificationCount = searchedInspections.filter(
    (item) => normalizeInspectionStatus(item.status) === 'identification',
  ).length;
  const processedCount = searchedInspections.filter(
    (item) => normalizeInspectionStatus(item.status) === 'processed',
  ).length;
  const loadedCount = searchedInspections.filter(
    (item) => normalizeInspectionStatus(item.status) === 'loaded',
  ).length;

  return (
    <div className="space-y-6">
      <section className="relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10">
        <PortalHeroPhoto src="/portal/cargo-dashboard.webp" veil="bottom" />
        <div className="relative flex flex-wrap items-start justify-between gap-4 px-6 py-8 md:px-8 md:py-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Client portal
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {kind === 'account' ? (
                <>
                  Your <span className="text-[#F51EA0]">inspections</span>
                </>
              ) : (
                <>
                  Your cargo <span className="text-[#F51EA0]">status</span>
                </>
              )}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-normal text-white/80">
              {kind === 'account' ? (
                <p>
                  {clientName ? (
                    <>
                      Client{' '}
                      <span className="font-semibold text-white">{clientName}</span>
                    </>
                  ) : (
                    'All portal-enabled inspections for your account'
                  )}
                </p>
              ) : (
                <>
                  <p>
                    AWB{' '}
                    <span className="font-mono font-semibold text-white">
                      {awbNumber}
                    </span>
                  </p>
                  <CopyAwbButton awbNumber={awbNumber} variant="onDark" />
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/45 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-black/30 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/45"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PortalStatCard
          icon={ScanSearch}
          label="Identification"
          value={identificationCount}
          hint="Pending"
          active={statusFilter === 'identification'}
          onSelect={() =>
            setStatusFilter((current) =>
              current === 'identification' ? 'all' : 'identification',
            )
          }
        />
        <PortalStatCard
          icon={CheckCircle2}
          label="Processed"
          value={processedCount}
          hint="Completed"
          active={statusFilter === 'processed'}
          onSelect={() =>
            setStatusFilter((current) =>
              current === 'processed' ? 'all' : 'processed',
            )
          }
        />
        <PortalStatCard
          icon={Truck}
          label="On truck"
          value={loadedCount}
          hint="In transit"
          active={statusFilter === 'loaded'}
          onSelect={() =>
            setStatusFilter((current) => (current === 'loaded' ? 'all' : 'loaded'))
          }
        />
      </div>

      {!loading && inspections.length > 0 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => {
            const selected = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? 'bg-[#F51EA0] text-white'
                    : 'portal-glass text-white/75 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {kind === 'account' && !loading && inspections.length > 0 ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden
          />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filter by AWB, ULD, or product…"
            className="w-full rounded-xl portal-glass py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#F51EA0]/50"
          />
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/55">Loading inspections…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : inspections.length === 0 ? (
        <PortalEmptyCard
          title={
            kind === 'account'
              ? 'No portal-enabled inspections yet'
              : 'No inspections for this AWB yet'
          }
          body={
            kind === 'account'
              ? 'Inspections for this account will appear here once they are available.'
              : 'Nothing for this air waybill is shared on the portal yet.'
          }
        />
      ) : visibleInspections.length === 0 ? (
        <PortalEmptyCard
          title="No matching inspections"
          body={
            searchQuery.trim() && statusFilter !== 'all'
              ? 'Nothing matches this status and search.'
              : statusFilter !== 'all'
                ? 'No inspections in this status.'
                : `Nothing matches “${searchQuery.trim()}”.`
          }
        />
      ) : (
        <div className="grid gap-4">
          {visibleInspections.map((inspection) => (
            <PortalInspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </div>
  );
}

function PortalStatCard({
  icon: Icon,
  label,
  value,
  hint,
  active,
  onSelect,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-center gap-4 rounded-2xl portal-glass px-5 py-5 text-left transition ${
        active ? 'ring-2 ring-[#F51EA0]' : 'hover:border-white/40'
      }`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="pr-[0.12em] text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-white/45">
          {label}
        </p>
        <p className="mt-2 text-3xl font-bold leading-none">{value}</p>
        <p className="mt-1.5 text-xs font-normal leading-4 text-white/55">{hint}</p>
      </div>
    </button>
  );
}

function PortalEmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl portal-glass px-6 py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
        <ClipboardList className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="mt-4 text-lg font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm font-normal text-white/55">{body}</p>
    </div>
  );
}
