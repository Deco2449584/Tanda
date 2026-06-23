'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plane,
} from 'lucide-react';
import { EditInspectionModal } from '@/components/inspections/EditInspectionModal';
import { InspectionPortalAccess } from '@/components/inspections/InspectionPortalAccess';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { markCargoInspectionAsLoaded } from '@/lib/inspections/mark-loaded';
import { getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionDetailViewProps {
  inspection: CargoInspection;
  showBackLink?: boolean;
  backHref?: string;
  canEdit?: boolean;
  editorEmail?: string;
  onUpdated?: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function InspectionDetailView({
  inspection,
  showBackLink = true,
  backHref = '/inspections',
  canEdit = false,
  editorEmail = '',
  onUpdated,
}: InspectionDetailViewProps) {
  const [markingLoaded, setMarkingLoaded] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [markError, setMarkError] = useState('');
  const [exportError, setExportError] = useState('');
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
      onUpdated?.();
    } catch {
      setMarkError('Could not mark this container as loaded. Please try again.');
    } finally {
      setMarkingLoaded(false);
    }
  }

  async function handleExportPdf() {
    setExportError('');
    setExportingPdf(true);

    try {
      await exportCargoInspectionPdf(viewInspection);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not export PDF.';
      setExportError(message);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showBackLink ? (
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to inspections
            </Link>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {exportingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              Export PDF
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Cargo inspection
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
            {inspection.uldId}
          </h1>
          <p className="mt-1 text-sm text-muted">AWB {inspection.awbNumber}</p>

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

          <p className="mt-4 text-xs text-subtle">
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

        {exportError && (
          <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {exportError}
          </p>
        )}

        <section className="grid gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:grid-cols-2 md:p-6">
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
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {inspection.issueDescription?.trim() || 'No description provided.'}
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Photo evidence ({inspection.photoEvidence.length})
          </h2>
          <div className="mt-4">
            <InspectionPhotoGallery photos={inspection.photoEvidence} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Video evidence ({inspection.videoEvidence.length})
          </h2>
          <div className="mt-4">
            <InspectionVideoGallery videos={inspection.videoEvidence} />
          </div>
        </section>

        {canEdit ? (
          <InspectionPortalAccess inspection={inspection} onUpdated={onUpdated} />
        ) : null}
      </div>

      {canEdit && editOpen && (
        <EditInspectionModal
          inspection={inspection}
          editorEmail={editorEmail}
          onClose={() => setEditOpen(false)}
          onSaved={() => onUpdated?.()}
        />
      )}
    </>
  );
}
