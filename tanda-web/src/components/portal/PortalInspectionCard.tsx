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
  'REQUIRES ATTENTION': 'bg-amber-400/20 text-amber-100 ring-amber-300/30',
  NEW: 'bg-sky-400/20 text-sky-100 ring-sky-300/30',
  LOADED: 'bg-emerald-400/20 text-emerald-100 ring-emerald-300/30',
};

export function PortalInspectionCard({ inspection }: PortalInspectionCardProps) {
  const status = getInspectionListStatus(
    inspection as Parameters<typeof getInspectionListStatus>[0],
  );
  const statusClass =
    PORTAL_STATUS_CLASSES[status.label] ??
    'bg-white/10 text-white/80 ring-white/15';

  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  return (
    <Link
      href={`/portal/track/${inspection.id}`}
      className="group flex overflow-hidden rounded-2xl border border-[#262626]/20 bg-[#2F2F2F] text-white shadow-md transition hover:border-[#F51EA0]/40 hover:shadow-lg"
    >
      <div className="w-1.5 shrink-0 bg-[#F51EA0]" aria-hidden />

      <div className="flex min-w-0 flex-1 gap-4 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Package className="h-5 w-5 text-white/80" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-white">
                {inspection.uldId}
              </p>
              <p className="truncate text-xs text-white/55">
                AWB {inspection.awbNumber}
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-[#F51EA0]"
              aria-hidden
            />
          </div>

          {inspection.clientLocationName ? (
            <p className="mt-1.5 truncate text-xs font-medium text-[#F51EA0]/90">
              {inspection.clientLocationName}
            </p>
          ) : null}

          <p className="mt-1 truncate text-sm text-white/85">{inspection.foodType}</p>
          <p className="mt-0.5 truncate text-xs text-white/50">
            {getConservationLabel(inspection.conservationType)} · {inspection.weightKg}{' '}
            kg · {inspection.boxCount} boxes
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${statusClass}`}
            >
              {status.label}
            </span>
            <span className="text-[10px] text-white/45">{dateLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
