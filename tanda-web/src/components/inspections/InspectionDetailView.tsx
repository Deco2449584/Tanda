'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plane,
  Trash2,
} from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { DeleteInspectionConfirmModal } from '@/components/inspections/DeleteInspectionConfirmModal';
import { EditInspectionModal } from '@/components/inspections/EditInspectionModal';
import { InspectionPortalAccess } from '@/components/inspections/InspectionPortalAccess';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { requestDeleteInspection } from '@/lib/inspections/inspections-api';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { markCargoInspectionAsLoaded } from '@/lib/inspections/mark-loaded';
import { markCargoInspectionAsProcessed } from '@/lib/inspections/mark-processed';
import { formatPersonName, getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionDetailViewProps {
  inspection: CargoInspection;
  showBackLink?: boolean;
  backHref?: string;
  canEdit?: boolean;
  canDelete?: boolean;
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
  canDelete = false,
  editorEmail = '',
  onUpdated,
}: InspectionDetailViewProps) {
  const router = useRouter();
  const [markingProcessed, setMarkingProcessed] = useState(false);
  const [markingLoaded, setMarkingLoaded] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  async function handleMarkAsProcessed() {
    setMarkError('');
    setMarkingProcessed(true);

    try {
      const updatedAtIso = await markCargoInspectionAsProcessed(inspection.id);
      setLocalStatus('processed');
      setLocalUpdatedAt(updatedAtIso);
      onUpdated?.();
    } catch {
      setMarkError('Could not mark this record as processed. Please try again.');
    } finally {
      setMarkingProcessed(false);
    }
  }

  async function handleMarkAsLoaded() {
    if (
      viewInspection.hasIssues &&
      !window.confirm(
        'This record still has open issues. Mark it on truck anyway?',
      )
    ) {
      return;
    }

    setMarkError('');
    setMarkingLoaded(true);

    try {
      const updatedAtIso = await markCargoInspectionAsLoaded(inspection.id);
      setLocalStatus('loaded');
      setLocalUpdatedAt(updatedAtIso);
      onUpdated?.();
    } catch {
      setMarkError('Could not mark this record as on truck. Please try again.');
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

  async function handleConfirmDelete() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await requestDeleteInspection(inspection.id);
      setDeleteOpen(false);
      onUpdated?.();
      router.push(backHref);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Could not delete inspection.',
      );
    } finally {
      setDeleting(false);
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
            {canDelete ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:border-red-700 hover:bg-red-950/50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </button>
            ) : null}
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Cargo inspection
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground md:text-3xl">
            {inspection.uldId}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted">AWB {inspection.awbNumber}</p>
            <CopyAwbButton awbNumber={inspection.awbNumber} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`inline-flex rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${detailStatus.lifecycleClassName}`}
            >
              {detailStatus.lifecycleLabel}
            </span>
            {detailStatus.hasIssues ? (
              <span className="inline-flex rounded-md bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200 ring-1 ring-amber-400/30">
                Issues
              </span>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-subtle">
            Registered {formatInspectionDate(inspection.registeredAt)}
            {localUpdatedAt
              ? ` · Updated ${formatInspectionDate(localUpdatedAt)}`
              : ''}
          </p>
        </section>

        {canEdit && detailStatus.status === 'identification' ? (
          <button
            type="button"
            onClick={() => void handleMarkAsProcessed()}
            disabled={markingProcessed}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {markingProcessed ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            )}
            Mark processed
          </button>
        ) : null}

        {canEdit && detailStatus.status === 'processed' ? (
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
            Mark on truck
          </button>
        ) : null}

        {canEdit && markError ? (
          <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {markError}
          </p>
        ) : null}

        {exportError && (
          <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {exportError}
          </p>
        )}

        <section className="grid gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:grid-cols-2 md:p-6">
          {inspection.clientLocationName ? (
            <DetailRow label="Client" value={inspection.clientLocationName} />
          ) : null}
          <DetailRow
            label="Conservation"
            value={getConservationLabel(inspection.conservationType)}
          />
          <DetailRow label="Food type" value={inspection.foodType} />
          <DetailRow label="Weight" value={`${inspection.weightKg} kg`} />
          <DetailRow label="Box count" value={String(inspection.boxCount)} />
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
            <DetailRow label="Driver name" value={inspection.driverName} />
          ) : null}
          {inspection.transportCompany ? (
            <DetailRow label="Transport company" value={inspection.transportCompany} />
          ) : null}
          <DetailRow
            label="Created by"
            value={formatPersonName(inspection.createdByName, inspection.createdBy)}
          />
          {inspection.updatedBy || inspection.updatedByName ? (
            <DetailRow
              label="Last edited by"
              value={formatPersonName(inspection.updatedByName, inspection.updatedBy)}
            />
          ) : null}
          <DetailRow
            label="Registered at"
            value={formatInspectionDate(inspection.registeredAt)}
          />
          {inspection.dispatchedAt ? (
            <DetailRow
              label="Loaded on truck at"
              value={formatInspectionDate(inspection.dispatchedAt)}
            />
          ) : null}
          {typeof inspection.registeredLatitude === 'number' &&
          typeof inspection.registeredLongitude === 'number' ? (
            <DetailRow
              label="Registered GPS"
              value={`${inspection.registeredLatitude.toFixed(6)}, ${inspection.registeredLongitude.toFixed(6)}${
                typeof inspection.registeredAccuracyMeters === 'number'
                  ? ` (±${inspection.registeredAccuracyMeters} m)`
                  : ''
              }`}
            />
          ) : null}
          {inspection.registeredLocationAt ? (
            <DetailRow
              label="GPS captured at"
              value={formatInspectionDate(inspection.registeredLocationAt)}
            />
          ) : null}
          {inspection.registeredMapsUrl ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Maps
              </p>
              <a
                href={inspection.registeredMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-primary underline"
              >
                Open in Maps
              </a>
            </div>
          ) : null}
        </section>

        {inspection.hasIssues && (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 md:p-6">
            <h2 className="text-sm font-semibold text-amber-200">Issue description</h2>
            {inspection.issueReportedAt ? (
              <p className="mt-2 text-xs text-amber-200/80">
                Reported {formatInspectionDate(inspection.issueReportedAt)}
              </p>
            ) : null}
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

      {canDelete ? (
        <DeleteInspectionConfirmModal
          inspection={deleteOpen ? inspection : null}
          loading={deleting}
          error={deleteError}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => {
            if (deleting) return;
            setDeleteOpen(false);
            setDeleteError(null);
          }}
        />
      ) : null}
    </>
  );
}
