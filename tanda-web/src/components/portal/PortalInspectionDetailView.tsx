'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface PortalInspectionDetailViewProps {
  inspection: CargoInspection;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export function PortalInspectionDetailView({
  inspection,
}: PortalInspectionDetailViewProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  const detailStatus = getInspectionDetailStatus(inspection);

  async function handleExportPdf() {
    setExportError('');
    setExportingPdf(true);

    try {
      await exportCargoInspectionPdf(inspection);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo exportar el PDF.';
      setExportError(message);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/portal/track"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al listado
        </Link>

        <button
          type="button"
          onClick={() => void handleExportPdf()}
          disabled={exportingPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden />
          )}
          Exportar PDF
        </button>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Inspección de carga
        </p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900 md:text-3xl">
          {inspection.uldId}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">AWB {inspection.awbNumber}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {detailStatus.showLifecycleBadge && detailStatus.lifecycleLabel && (
            <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200">
              {detailStatus.lifecycleLabel === 'NEW IN WAREHOUSE'
                ? 'NUEVO EN BODEGA'
                : detailStatus.lifecycleLabel}
            </span>
          )}
          {detailStatus.isFullyLoaded && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Carga completa
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Registrado {formatInspectionDate(inspection.registeredAt)}
          {inspection.updatedAt
            ? ` · Actualizado ${formatInspectionDate(inspection.updatedAt)}`
            : ''}
        </p>
      </section>

      {exportError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </p>
      )}

      <section className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2 md:p-6">
        <DetailRow
          label="Conservación"
          value={getConservationLabel(inspection.conservationType)}
        />
        <DetailRow label="Tipo de alimento" value={inspection.foodType} />
        <DetailRow label="Peso" value={`${inspection.weightKg} kg`} />
        <DetailRow label="Cajas" value={String(inspection.boxCount)} />
      </section>

      {inspection.hasIssues && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-amber-900">Descripción del problema</h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-950">
            {inspection.issueDescription?.trim() || 'Sin descripción.'}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          Evidencia fotográfica ({inspection.photoEvidence.length})
        </h2>
        <div className="mt-4 portal-gallery">
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">
          Evidencia en video ({inspection.videoEvidence.length})
        </h2>
        <div className="mt-4">
          <InspectionVideoGallery videos={inspection.videoEvidence} />
        </div>
      </section>
    </div>
  );
}
