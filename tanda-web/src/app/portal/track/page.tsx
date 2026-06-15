'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, RefreshCw } from 'lucide-react';
import { PortalAuthGuard } from '@/components/portal/PortalAuthGuard';
import { PortalInspectionCard } from '@/components/portal/PortalInspectionCard';
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
          : 'No se pudieron cargar las inspecciones.';
      if (message.includes('Sesión') || message.includes('autorizado')) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Estado de su carga</h1>
          <p className="mt-1 text-sm text-zinc-600">
            AWB <span className="font-semibold text-zinc-900">{awbNumber}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Actualización automática cada 60 segundos
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden
            />
            Actualizar
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Salir
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Cargando inspecciones…</p>
      ) : error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : inspections.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          No hay inspecciones disponibles para esta guía en el portal.
        </p>
      ) : (
        <div className="grid gap-3">
          {inspections.map((inspection) => (
            <PortalInspectionCard key={inspection.id} inspection={inspection} />
          ))}
        </div>
      )}
    </div>
  );
}
