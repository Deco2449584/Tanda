'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PortalAuthGuard } from '@/components/portal/PortalAuthGuard';
import { PortalInspectionDetailView } from '@/components/portal/PortalInspectionDetailView';
import { fetchPortalInspectionDetail } from '@/lib/portal/client-api';
import { clearPortalSession } from '@/lib/portal/client-session';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const POLL_MS = 60_000;

export default function PortalTrackDetailPage() {
  return (
    <PortalAuthGuard>
      <PortalTrackDetailContent />
    </PortalAuthGuard>
  );
}

function PortalTrackDetailContent() {
  const params = useParams<{ id: string }>();
  const inspectionId = params?.id ?? '';
  const router = useRouter();
  const [inspection, setInspection] = useState<CargoInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!inspectionId) return;

    try {
      const data = await fetchPortalInspectionDetail(inspectionId);
      setInspection(data);
      setError('');
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo cargar la inspección.';
      if (message.includes('Sesión') || message.includes('autorizado')) {
        clearPortalSession();
        router.replace('/portal');
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [inspectionId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando inspección…</p>;
  }

  if (error || !inspection) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || 'Inspección no encontrada.'}
      </p>
    );
  }

  return <PortalInspectionDetailView inspection={inspection} />;
}
