'use client';

import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { getInspectionListStatus } from '@/lib/inspections/status';
import type { PortalInspectionSummary } from '@/lib/portal/client-api';

interface PortalInspectionCardProps {
  inspection: PortalInspectionSummary;
}

const PORTAL_STATUS_CLASSES: Record<string, string> = {
  'REQUIRES ATTENTION': 'bg-amber-100 text-amber-900 ring-amber-200',
  NEW: 'bg-sky-100 text-sky-900 ring-sky-200',
  LOADED: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
};

export function PortalInspectionCard({ inspection }: PortalInspectionCardProps) {
  const status = getInspectionListStatus(
    inspection as Parameters<typeof getInspectionListStatus>[0],
  );
  const statusClass =
    PORTAL_STATUS_CLASSES[status.label] ?? 'bg-slate-100 text-slate-700 ring-slate-200';

  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  return (
    <Link
      href={`/portal/track/${inspection.id}`}
      className="group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-[#262626]/25 hover:shadow-md"
    >
      <div className="w-1.5 shrink-0 bg-[#262626]" aria-hidden />

      <div className="flex min-w-0 flex-1 gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#262626]/5">
          <Package className="h-5 w-5 text-[#262626]" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                {inspection.uldId}
              </p>
              <p className="truncate text-xs text-slate-500">
                AWB {inspection.awbNumber}
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#262626]"
              aria-hidden
            />
          </div>

          <p className="mt-1.5 truncate text-sm text-slate-700">{inspection.foodType}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {getConservationLabel(inspection.conservationType)} · {inspection.weightKg}{' '}
            kg · {inspection.boxCount} boxes
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusClass}`}
            >
              {status.label}
            </span>
            <span className="text-[10px] text-slate-500">{dateLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
