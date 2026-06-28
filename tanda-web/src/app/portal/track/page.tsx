'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plane, RefreshCw } from 'lucide-react';
import { PortalInspectionCard } from '@/components/portal/PortalInspectionCard';
import { PortalAuthGuard } from '@/components/portal/PortalAuthGuard';
import {
  fetchPortalInspectionsList,
  type PortalInspectionSummary,
} from '@/lib/portal/client-api';
import {
  clearPortalSession,
  getPortalAwb,
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
  const [awbNumber, setAwbNumber] = useState('');
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
      setAwbNumber(data.awbNumber);
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
    setAwbNumber(getPortalAwb() ?? '');
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

  const loadedCount = inspections.filter(
    (item) => item.status === 'loaded' && !item.hasIssues,
  ).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-[#262626]/10 bg-gradient-to-r from-[#262626] to-[#606060] text-white shadow-lg">
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 38.59l2.83-2.83 1.41 1.41L1.41 40H0v-1.41zM0 1.4l2.83 2.83 1.41-1.41L1.41 0H0v1.41zM38.59 40l-2.83-2.83 1.41-1.41L40 38.59V40h-1.41zM40 1.41l-2.83 2.83-1.41-1.41L38.59 0H40v1.41zM20 18.6l2.83-2.83 1.41 1.41L21.41 20l2.83 2.83-1.41 1.41L20 21.41l-2.83 2.83-1.41-1.41L18.59 20l-2.83-2.83 1.41-1.41L20 18.59z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-200">
                <Plane className="h-4 w-4" aria-hidden />
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Shipment overview
                </p>
              </div>
              <h1 className="mt-2 text-2xl font-bold md:text-3xl">Your cargo status</h1>
              <p className="mt-2 text-sm text-white/75">
                AWB{' '}
                <span className="font-mono font-semibold text-white">{awbNumber}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Active ULDs
              </p>
              <p className="mt-1 text-2xl font-bold">{inspections.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Loaded
              </p>
              <p className="mt-1 text-2xl font-bold">{loadedCount}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
                Auto-refresh
              </p>
              <p className="mt-1 text-sm font-semibold">Every 60 seconds</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading inspections…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : inspections.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 shadow-sm">
          No inspections are available for this AWB on the portal.
        </p>
      ) : (
        <div className="grid gap-4">
          {inspections.map((inspection) => (
            <PortalInspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </div>
  );
}
