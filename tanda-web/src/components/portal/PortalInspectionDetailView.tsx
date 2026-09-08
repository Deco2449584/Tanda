'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
} from 'lucide-react';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { resolveInspectionMapsUrl } from '@/lib/inspections/inspection-maps-url';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface PortalInspectionDetailViewProps {
  inspection: CargoInspection;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

export function PortalInspectionDetailView({
  inspection,
}: PortalInspectionDetailViewProps) {
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  const detailStatus = getInspectionDetailStatus(inspection);
  const mapsUrl = resolveInspectionMapsUrl(inspection);

  async function handleExportPdf() {
    setExportError('');
    setExportingPdf(true);

    try {
      await exportCargoInspectionPdf(inspection);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not export PDF.';
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
          className="inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to list
        </Link>

        <button
          type="button"
          onClick={() => void handleExportPdf()}
          disabled={exportingPdf}
          className="inline-flex items-center gap-2 rounded-lg border border-[#262626]/25 bg-[#262626] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a1a1a] disabled:opacity-50"
        >
          {exportingPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5" aria-hidden />
          )}
          Export PDF
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#262626]/15 bg-gradient-to-br from-[#262626] to-[#4A4A4A] p-5 text-white shadow-lg md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
          Cargo inspection
        </p>
        <h1 className="font-display mt-2 text-2xl font-normal tracking-wide md:text-3xl">
          {inspection.uldId}
        </h1>
        <p className="mt-1 text-sm text-white/70">AWB {inspection.awbNumber}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {detailStatus.showLifecycleBadge && detailStatus.lifecycleLabel && (
            <span className="inline-flex rounded-md bg-sky-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-100 ring-1 ring-sky-300/30">
              {detailStatus.lifecycleLabel}
            </span>
          )}
          {detailStatus.isFullyLoaded && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100 ring-1 ring-emerald-300/30">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Fully loaded
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-white/50">
          Registered {formatInspectionDate(inspection.registeredAt)}
          {inspection.updatedAt
            ? ` · Updated ${formatInspectionDate(inspection.updatedAt)}`
            : ''}
        </p>
      </section>

      {exportError && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {exportError}
        </p>
      )}

      <section className="grid gap-4 rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md sm:grid-cols-2 md:p-6">
        {inspection.clientLocationName ? (
          <DetailRow label="Site / client" value={inspection.clientLocationName} />
        ) : null}
        <DetailRow
          label="Conservation"
          value={getConservationLabel(inspection.conservationType)}
        />
        <DetailRow label="Food type" value={inspection.foodType} />
        <DetailRow label="Weight" value={`${inspection.weightKg} kg`} />
        <DetailRow label="Boxes" value={String(inspection.boxCount)} />
        {typeof inspection.temperatureCelsius === 'number' ? (
          <DetailRow
            label="Temperature"
            value={`${inspection.temperatureCelsius} °C`}
          />
        ) : null}
        {inspection.exitVehiclePlate ? (
          <DetailRow label="Exit vehicle plate" value={inspection.exitVehiclePlate} />
        ) : null}
        {inspection.driverName ? (
          <DetailRow label="Driver" value={inspection.driverName} />
        ) : null}
        {inspection.transportCompany ? (
          <DetailRow label="Transport company" value={inspection.transportCompany} />
        ) : null}
        {inspection.dispatchedAt ? (
          <DetailRow
            label="Loaded on truck"
            value={formatInspectionDate(inspection.dispatchedAt)}
          />
        ) : null}
        {mapsUrl ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
              Registration location
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F51EA0] underline-offset-2 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              View on map
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </div>
        ) : null}
      </section>

      {inspection.hasIssues && (
        <section className="rounded-2xl border border-amber-400/40 bg-amber-950/90 p-5 text-amber-50 md:p-6">
          <h2 className="text-sm font-semibold text-amber-100">Issue description</h2>
          {inspection.issueReportedAt ? (
            <p className="mt-2 text-xs text-amber-200/80">
              Reported {formatInspectionDate(inspection.issueReportedAt)}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-amber-50">
            {inspection.issueDescription?.trim() || 'No description provided.'}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Photo evidence ({inspection.photoEvidence.length})
        </h2>
        <div className="mt-4 portal-gallery">
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Video evidence ({inspection.videoEvidence.length})
        </h2>
        <div className="mt-4">
          <InspectionVideoGallery
            videos={inspection.videoEvidence}
            accessMode="link"
            theme="dark"
          />
        </div>
      </section>
    </div>
  );
}
