'use client';

import { useMemo, useState } from 'react';
import {
  Bus,
  FileDown,
  Loader2,
  MapPin,
  Pencil,
  TriangleAlert,
} from 'lucide-react';
import { InspectScreenHeader } from '@/components/inspect/InspectScreenHeader';
import { InspectEvidenceReupload } from '@/components/inspect/InspectEvidenceReupload';
import { EditInspectionModal } from '@/components/inspections/EditInspectionModal';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { Dialog } from '@/components/ui/Dialog';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
} from '@/lib/inspections/cargo-unit-type';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { resolveInspectionMapsUrl } from '@/lib/inspections/inspection-maps-url';
import { markCargoInspectionAsLoaded } from '@/lib/inspections/mark-loaded';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { resolveInspectionStatus } from '@/lib/inspections/status';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { getInspectLifecycle } from '@/lib/inspect/status-labels';
import type { CargoInspection } from '@/lib/types/cargo-inspection';
import { useInspectInspections } from '@/providers/InspectInspectionsProvider';
import { useInspectSession } from '@/providers/InspectSessionProvider';

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
      <span className="shrink-0 text-xs font-semibold text-subtle">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-foreground">
        {value}
      </span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-surface-base/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

export function InspectDetailScreen({
  inspectionId,
}: {
  inspectionId: string;
}) {
  const { inspectionsById, loading } = useInspectInspections();
  const { user, employee, isInspectAdmin } = useInspectSession();

  const inspection = inspectionsById.get(inspectionId) ?? null;
  const editorEmail = employee?.email || user.email || '';

  const [dispatching, setDispatching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const lifecycle = useMemo(
    () => (inspection ? getInspectLifecycle(inspection) : null),
    [inspection],
  );

  if (loading && !inspection) {
    return <LoadingIndicator message="Loading inspection…" />;
  }

  if (!inspection) {
    return (
      <div className="mx-auto max-w-2xl">
        <InspectScreenHeader
          title="Cargo inspection"
          subtitle={INSPECT_BRAND.company}
          backHref="/inspect"
          backLabel="Records"
        />
        <div className="px-4">
          <EmptyState
            title="Inspection not found"
            description="This record may have been removed, or it belongs to another operator."
          />
        </div>
      </div>
    );
  }

  const isInWarehouse = resolveInspectionStatus(inspection) === 'new';
  const mapsUrl = resolveInspectionMapsUrl(inspection);

  async function runMarkLoaded(target: CargoInspection) {
    setDispatching(true);
    setError('');

    try {
      await markCargoInspectionAsLoaded(target.id);
      setConfirmOpen(false);
    } catch (markError) {
      console.error('markCargoInspectionAsLoaded', markError);
      setError('Could not mark this unit on truck. Please try again.');
    } finally {
      setDispatching(false);
    }
  }

  async function handleExportPdf(target: CargoInspection) {
    setExporting(true);
    setError('');

    try {
      await exportCargoInspectionPdf(target);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not export the PDF.',
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <InspectScreenHeader
        title="Cargo inspection"
        subtitle={INSPECT_BRAND.company}
        backHref="/inspect"
        backLabel="Records"
        actions={
          isInspectAdmin ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              aria-label="Edit inspection"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Edit
            </button>
          ) : null
        }
      />

      <div className="space-y-4 px-4 pb-8">
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-surface-raised to-surface-raised p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Inspection record
          </p>
          <h2 className="mt-1.5 font-display text-xl font-normal tracking-wide text-foreground">
            {getInspectionDisplayTitle(inspection)}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {getUnitTypeLabel(inspection.unitType)} · AWB{' '}
            {inspection.awbNumber || '—'}
          </p>

          {lifecycle ? (
            <span
              className={`mt-3 inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${lifecycle.className}`}
            >
              {lifecycle.label}
            </span>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MetricTile label="Weight" value={`${inspection.weightKg} kg`} />
            <MetricTile label="Boxes" value={String(inspection.boxCount)} />
            <MetricTile
              label="Cold chain"
              value={getConservationLabel(inspection.conservationType)}
            />
          </div>

          <p className="mt-3 text-xs text-subtle">
            Registered {formatInspectionDate(inspection.registeredAt)}
            {inspection.dispatchedAt
              ? ` · On truck since ${formatInspectionDate(inspection.dispatchedAt)}`
              : ''}
          </p>
        </section>

        {error ? (
          <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <section className="space-y-2 rounded-2xl border border-border bg-surface-raised p-4">
          {isInWarehouse ? (
            <>
              {inspection.hasIssues ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  This record has open issues. Marking on truck will ask for
                  confirmation.
                </p>
              ) : null}
              <button
                type="button"
                disabled={dispatching}
                onClick={() => {
                  if (inspection.hasIssues) {
                    setConfirmOpen(true);
                    return;
                  }
                  void runMarkLoaded(inspection);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600/90 disabled:opacity-60"
              >
                {dispatching ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Bus className="h-4 w-4" aria-hidden />
                )}
                Mark on truck
              </button>
            </>
          ) : null}

          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportPdf(inspection)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface-base px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileDown className="h-4 w-4" aria-hidden />
            )}
            Export inspection PDF
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Shipment details
          </h3>
          <DetailRow label="Client" value={inspection.clientLocationName} />
          <DetailRow
            label="Unit type"
            value={getUnitTypeLabel(inspection.unitType)}
          />
          <DetailRow label="ULD ID" value={inspection.uldId} />
          <DetailRow label="AWB" value={inspection.awbNumber} />
          <DetailRow label="Food type" value={inspection.foodType} />
          <DetailRow
            label="Temperature"
            value={
              typeof inspection.temperatureCelsius === 'number'
                ? `${inspection.temperatureCelsius} °C`
                : undefined
            }
          />
          <DetailRow
            label="Exit vehicle plate"
            value={inspection.exitVehiclePlate}
          />
          <DetailRow label="Driver name" value={inspection.driverName} />
          <DetailRow
            label="Transport company"
            value={inspection.transportCompany}
          />
          <DetailRow
            label="GPS captured at"
            value={
              inspection.registeredLocationAt
                ? formatInspectionDate(inspection.registeredLocationAt)
                : undefined
            }
          />
          <DetailRow
            label="Registered at"
            value={formatInspectionDate(inspection.registeredAt)}
          />
          <DetailRow
            label="Loaded on truck at"
            value={
              inspection.dispatchedAt
                ? formatInspectionDate(inspection.dispatchedAt)
                : undefined
            }
          />
          {isInspectAdmin ? (
            <DetailRow label="Operator" value={inspection.createdBy} />
          ) : null}

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Open in Maps
            </a>
          ) : null}
        </section>

        {inspection.hasIssues ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <h3 className="text-sm font-semibold text-amber-200">
              Issue report
            </h3>
            {inspection.issueReportedAt ? (
              <p className="mt-0.5 text-xs text-subtle">
                Reported {formatInspectionDate(inspection.issueReportedAt)}
              </p>
            ) : null}
            <p className="mt-2 text-[13px] text-foreground">
              {inspection.issueDescription || 'No description provided.'}
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Photo evidence ({inspection.photoEvidence.length})
          </h3>
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </section>

        <section className="rounded-2xl border border-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Video evidence ({inspection.videoEvidence.length})
          </h3>
          <InspectionVideoGallery videos={inspection.videoEvidence} />
        </section>

        <InspectEvidenceReupload
          inspection={inspection}
          userId={inspection.userId || user.uid}
        />
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Dispatch with open issues?"
        description="This unit has reported damage or problems. Marking it on truck keeps the issue on record."
        size="sm"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="flex-1 rounded-lg border border-border-strong bg-surface-base px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={dispatching}
            onClick={() => void runMarkLoaded(inspection)}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600/90 disabled:opacity-60"
          >
            Dispatch anyway
          </button>
        </div>
      </Dialog>

      {editOpen ? (
        <EditInspectionModal
          inspection={inspection}
          editorEmail={editorEmail}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}
