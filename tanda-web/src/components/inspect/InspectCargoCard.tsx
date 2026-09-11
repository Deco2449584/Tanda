'use client';

import Link from 'next/link';
import { ChevronRight, Package, Paperclip, RotateCcw } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { useInspectionMediaQueue } from '@/hooks/useInspectionMediaQueue';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
} from '@/lib/inspections/cargo-unit-type';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import {
  getInspectionUploadSummary,
  retryInspectionMediaJob,
} from '@/lib/inspect/media-queue';
import { getInspectLifecycle } from '@/lib/inspect/status-labels';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

const SUMMARY_STYLES = {
  pending: 'text-sky-300',
  uploaded: 'text-emerald-300',
  error: 'text-danger',
} as const;

export function InspectCargoCard({
  inspection,
}: {
  inspection: CargoInspection;
}) {
  const jobs = useInspectionMediaQueue();
  const summary = getInspectionUploadSummary(jobs, inspection.id);
  const failedJob =
    summary?.status === 'error'
      ? jobs.find(
          (job) =>
            job.inspectionId === inspection.id && job.status === 'error',
        )
      : undefined;

  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;
  const lifecycle = getInspectLifecycle(inspection);
  const dateLabel = formatInspectionDate(
    inspection.updatedAt ?? inspection.registeredAt,
  );

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <Link
        href={`/inspect/${inspection.id}`}
        className="group flex transition-colors hover:bg-surface-hover/40"
      >
        <div className="w-1 shrink-0 bg-primary" aria-hidden />

        <div className="flex min-w-0 flex-1 gap-3 p-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-hover">
            {thumbUri ? (
              <FirebaseImage
                src={thumbUri}
                alt={getInspectionDisplayTitle(inspection)}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                sizes="48px"
                quality={70}
              />
            ) : (
              <Package className="h-5 w-5 text-primary" aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {getInspectionDisplayTitle(inspection)}
                </p>
                <p className="truncate text-xs text-subtle">
                  AWB {inspection.awbNumber || '—'}
                </p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-subtle transition group-hover:text-muted"
                aria-hidden
              />
            </div>

            <p className="mt-1 truncate text-[13px] text-muted">
              {inspection.foodType || '—'} ·{' '}
              {getUnitTypeLabel(inspection.unitType)}
            </p>
            <p className="mt-0.5 truncate text-xs text-subtle">
              {getConservationLabel(inspection.conservationType)} ·{' '}
              {inspection.weightKg} kg · {inspection.boxCount} boxes
            </p>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <span
                className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${lifecycle.className}`}
              >
                {lifecycle.label}
              </span>

              <div className="flex items-center gap-2 text-[10px] text-subtle">
                {mediaCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Paperclip className="h-3 w-3" aria-hidden />
                    {mediaCount}
                  </span>
                ) : null}
                <span>{dateLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {summary ? (
        <div className="border-t border-border px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p
              className={`text-[11px] font-semibold ${SUMMARY_STYLES[summary.status]}`}
            >
              {summary.label}
              {summary.status === 'pending' ? ` · ${summary.progress}%` : ''}
            </p>

            {failedJob ? (
              <button
                type="button"
                onClick={() => retryInspectionMediaJob(failedJob.id)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted transition hover:bg-surface-hover hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                Retry
              </button>
            ) : null}
          </div>

          {summary.status === 'pending' ? (
            <div
              className="mt-2 h-[3px] overflow-hidden rounded-full bg-surface-hover"
              role="progressbar"
              aria-valuenow={summary.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Evidence upload progress"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          ) : null}

          {failedJob?.errorMessage ? (
            <p className="mt-1.5 text-[11px] text-subtle">
              {failedJob.errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
