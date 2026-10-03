'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  ClipboardList,
  ChevronRight,
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

  const visibleInspections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return inspections;
    return inspections.filter((item) => {
      const haystack = [item.awbNumber, item.uldId, item.foodType]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [inspections, searchQuery]);

  const identificationCount = visibleInspections.filter(
    (item) => normalizeInspectionStatus(item.status) === 'identification',
  ).length;
  const processedCount = visibleInspections.filter(
    (item) => normalizeInspectionStatus(item.status) === 'processed',
  ).length;
  const loadedCount = visibleInspections.filter(
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
        />
        <PortalStatCard
          icon={CheckCircle2}
          label="Processed"
          value={processedCount}
          hint="Completed"
        />
        <PortalStatCard
          icon={Truck}
          label="On truck"
          value={loadedCount}
          hint="In transit"
        />
      </div>

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
          body={`Nothing matches “${searchQuery.trim()}”.`}
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
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl portal-glass px-5 py-5">
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
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
    </div>
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
