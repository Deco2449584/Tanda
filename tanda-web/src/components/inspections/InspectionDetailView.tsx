'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Plane } from 'lucide-react';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { markCargoInspectionAsLoaded } from '@/lib/inspections/mark-loaded';
import { getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionDetailViewProps {
  inspection: CargoInspection;
  showBackLink?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

export function InspectionDetailView({
  inspection,
  showBackLink = true,
}: InspectionDetailViewProps) {
  const [markingLoaded, setMarkingLoaded] = useState(false);
  const [markError, setMarkError] = useState('');
  const [localStatus, setLocalStatus] = useState(inspection.status);
  const [localUpdatedAt, setLocalUpdatedAt] = useState(inspection.updatedAt);

  const viewInspection: CargoInspection = {
    ...inspection,
    status: localStatus,
    updatedAt: localUpdatedAt,
  };

  const detailStatus = getInspectionDetailStatus(viewInspection);

  async function handleMarkAsLoaded() {
    setMarkError('');
    setMarkingLoaded(true);

    try {
      const updatedAtIso = await markCargoInspectionAsLoaded(inspection.id);
      setLocalStatus('loaded');
      setLocalUpdatedAt(updatedAtIso);
    } catch {
      setMarkError('Could not mark this container as loaded. Please try again.');
    } finally {
      setMarkingLoaded(false);
    }
  }

  return (
    <div className="space-y-5">
      {showBackLink && (
        <Link
          href="/inspections"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to inspections
        </Link>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Cargo inspection
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white md:text-3xl">
          {inspection.uldId}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">AWB {inspection.awbNumber}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {detailStatus.showLifecycleBadge && detailStatus.lifecycleLabel && (
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${detailStatus.lifecycleClassName}`}
            >
              {detailStatus.lifecycleLabel}
            </span>
          )}
          {detailStatus.isFullyLoaded && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              Fully Loaded
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Registered {formatInspectionDate(inspection.registeredAt)}
          {localUpdatedAt
            ? ` · Updated ${formatInspectionDate(localUpdatedAt)}`
            : ''}
        </p>
      </section>

      {detailStatus.isNewInWarehouse && (
        <button
          type="button"
          onClick={() => void handleMarkAsLoaded()}
          disabled={markingLoaded}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {markingLoaded ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plane className="h-4 w-4" aria-hidden />
          )}
          Mark as Loaded
        </button>
      )}

      {markError && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {markError}
        </p>
      )}

      <section className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:grid-cols-2 md:p-6">
        <DetailRow
          label="Conservation"
          value={getConservationLabel(inspection.conservationType)}
        />
        <DetailRow label="Food type" value={inspection.foodType} />
        <DetailRow label="Weight" value={`${inspection.weightKg} kg`} />
        <DetailRow label="Box count" value={String(inspection.boxCount)} />
        <DetailRow label="Operator" value={inspection.createdBy || '—'} />
      </section>

      {inspection.hasIssues && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-amber-200">Issue description</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {inspection.issueDescription?.trim() || 'No description provided.'}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Photo evidence ({inspection.photoEvidence.length})
        </h2>
        <div className="mt-4">
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Video evidence ({inspection.videoEvidence.length})
        </h2>
        <div className="mt-4">
          <InspectionVideoGallery videos={inspection.videoEvidence} />
        </div>
      </section>
    </div>
  );
}
