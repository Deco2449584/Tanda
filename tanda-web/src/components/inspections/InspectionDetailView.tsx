'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Thermometer,
  Trash2,
  User,
  Building2,
  Calendar,
  MapPin,
  Package,
  Dumbbell,
  Truck,
  Snowflake,
} from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import {
  InspectionIssuesBadge,
  InspectionLifecycleBadge,
} from '@/components/inspections/InspectionLifecycleBadge';
import { LifecycleStepper } from '@/components/inspections/LifecycleStepper';
import { DeleteInspectionConfirmModal } from '@/components/inspections/DeleteInspectionConfirmModal';
import { EditInspectionModal } from '@/components/inspections/EditInspectionModal';
import { InspectionPortalAccess } from '@/components/inspections/InspectionPortalAccess';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import { exportCargoInspectionPdf } from '@/lib/inspections/export-pdf';
import { formatInspectionDate } from '@/lib/inspections/format';
import { requestDeleteInspection } from '@/lib/inspections/inspections-api';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/lib/inspections/cargo-unit-type';
import {
  CONSERVATION_COLORS,
  getConservationLabel,
} from '@/lib/inspections/normalize-conservation';
import { markCargoInspectionAsLoaded } from '@/lib/inspections/mark-loaded';
import { markCargoInspectionAsProcessed } from '@/lib/inspections/mark-processed';
import {
  STATUS_ISSUES,
  STATUS_LOADED,
  formatPersonName,
  getInspectionDetailStatus,
} from '@/lib/inspections/status';
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

function DetailIconRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-hover text-[#0265DC]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
      </div>
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
          <LifecycleStepper inspection={viewInspection} />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Cargo inspection
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-2xl font-semibold text-foreground md:text-3xl">
              {getInspectionDisplayTitle(viewInspection)}
            </h1>
            <CopyAwbButton
              value={inspection.uldId.trim() || inspection.awbNumber}
              label="Copy identification number"
              iconOnly
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted">
              {getUnitTypeLabel(resolveUnitType(inspection.unitType, inspection.uldId))} · AWB{' '}
              {inspection.awbNumber}
            </p>
            <CopyAwbButton awbNumber={inspection.awbNumber} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <InspectionLifecycleBadge inspection={viewInspection} />
            {detailStatus.hasIssues ? <InspectionIssuesBadge /> : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border bg-surface-base px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                <Dumbbell className="h-3.5 w-3.5 text-[#0265DC]" aria-hidden />
                Weight
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {inspection.weightKg} kg
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-base px-3 py-2.5">
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-subtle">
                <Package className="h-3.5 w-3.5 text-[#0265DC]" aria-hidden />
                Boxes
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">{inspection.boxCount}</p>
            </div>
            <div
              className="rounded-xl border px-3 py-2.5"
              style={{
                backgroundColor: CONSERVATION_COLORS[inspection.conservationType].bg,
                borderColor: `${CONSERVATION_COLORS[inspection.conservationType].text}33`,
                color: CONSERVATION_COLORS[inspection.conservationType].text,
              }}
            >
              <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                <Snowflake className="h-3.5 w-3.5" aria-hidden />
                Cold chain
              </p>
              <p className="mt-1 text-sm font-semibold">
                {getConservationLabel(inspection.conservationType)}
              </p>
            </div>
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: STATUS_LOADED }}
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: STATUS_LOADED }}
          >
            {markingLoaded ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Bus className="h-4 w-4" aria-hidden />
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
            <DetailIconRow
              icon={Building2}
              label="Client"
              value={inspection.clientLocationName}
            />
          ) : null}
          <DetailIconRow
            icon={Package}
            label="Cargo type"
            value={getUnitTypeLabel(resolveUnitType(inspection.unitType, inspection.uldId))}
          />
          <DetailIconRow label="Product name" icon={Package} value={inspection.foodType} />
          {typeof inspection.temperatureCelsius === 'number' ? (
            <DetailIconRow
              icon={Thermometer}
              label="Temperature"
              value={`${inspection.temperatureCelsius} °C`}
            />
          ) : null}
          {inspection.exitVehiclePlate ? (
            <DetailIconRow
              icon={Truck}
              label="Exit vehicle plate"
              value={inspection.exitVehiclePlate}
            />
          ) : null}
          {inspection.driverName ? (
            <DetailIconRow icon={User} label="Driver name" value={inspection.driverName} />
          ) : null}
          {inspection.transportCompany ? (
            <DetailIconRow
              icon={Truck}
              label="Transport company"
              value={inspection.transportCompany}
            />
          ) : null}
          <DetailIconRow
            icon={User}
            label="Created by"
            value={formatPersonName(inspection.createdByName, inspection.createdBy)}
          />
          {inspection.updatedBy || inspection.updatedByName ? (
            <DetailIconRow
              icon={User}
              label="Last edited by"
              value={formatPersonName(inspection.updatedByName, inspection.updatedBy)}
            />
          ) : null}
          <DetailIconRow
            icon={Calendar}
            label="Registered at"
            value={formatInspectionDate(inspection.registeredAt)}
          />
          {inspection.dispatchedAt ? (
            <DetailIconRow
              icon={Bus}
              label="Loaded on truck at"
              value={formatInspectionDate(inspection.dispatchedAt)}
            />
          ) : null}
          {inspection.registeredLocationAt ? (
            <DetailIconRow
              icon={Calendar}
              label="GPS captured at"
              value={formatInspectionDate(inspection.registeredLocationAt)}
            />
          ) : null}
          {inspection.registeredMapsUrl ? (
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-hover text-[#0265DC]">
                <MapPin className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  Maps
                </p>
                <a
                  href={inspection.registeredMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-block text-sm font-semibold text-primary underline"
                >
                  Open in Maps
                </a>
              </div>
            </div>
          ) : null}
        </section>

        {inspection.hasIssues && (
          <section
            className="rounded-2xl border p-5 md:p-6"
            style={{
              backgroundColor: `${STATUS_ISSUES}14`,
              borderColor: `${STATUS_ISSUES}66`,
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: STATUS_ISSUES }}>
              Issue description
            </h2>
            {inspection.issueReportedAt ? (
              <p className="mt-2 text-xs" style={{ color: STATUS_ISSUES }}>
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
