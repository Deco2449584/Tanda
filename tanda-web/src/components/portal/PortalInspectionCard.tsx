'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Dumbbell, Package } from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { InspectionIssuesBadge } from '@/components/inspections/InspectionLifecycleBadge';
import {
  getUnitTypeIcon,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/lib/inspections/cargo-unit-type';
import { formatCountLabel } from '@/lib/inspections/count-unit';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { getInspectionListStatus } from '@/lib/inspections/status';
import type { PortalInspectionSummary } from '@/lib/portal/client-api';

interface PortalInspectionCardProps {
  inspection: PortalInspectionSummary;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/8 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {children}
    </span>
  );
}

export function PortalInspectionCard({ inspection }: PortalInspectionCardProps) {
  const status = getInspectionListStatus(inspection);
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  const UnitIcon = getUnitTypeIcon(unitType);
  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  const identificationNumber = inspection.uldId.trim() || inspection.awbNumber;

  return (
    <Link
      href={`/portal/track/${inspection.id}`}
      className="portal-glass group flex overflow-hidden rounded-[22px] text-white transition hover:border-white/25"
    >
      <div className="w-[3px] shrink-0 bg-white/30" aria-hidden />

      <div className="flex min-w-0 flex-1 gap-4 p-5">
        {inspection.photoUrl ? (
          <FirebaseImage
            src={inspection.photoUrl}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover"
            sizes="52px"
            quality={75}
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Package className="h-5 w-5 text-white" aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <p className="truncate text-base font-bold text-white">{inspection.uldId}</p>
                <CopyAwbButton
                  value={identificationNumber}
                  label="Copy identification number"
                  iconOnly
                  variant="onDark"
                />
              </div>
              <p className="truncate text-xs text-white/55">AWB {inspection.awbNumber}</p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-white"
              aria-hidden
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>
              <UnitIcon className="h-3 w-3" aria-hidden />
              {getUnitTypeLabel(unitType)}
            </Chip>
            {inspection.foodType.trim() ? <Chip>{inspection.foodType}</Chip> : null}
            <Chip>{getConservationLabel(inspection.conservationType)}</Chip>
            <Chip>
              <Dumbbell className="h-3 w-3" aria-hidden />
              {inspection.weightKg} kg
            </Chip>
            <Chip>
              <Package className="h-3 w-3" aria-hidden />
              {formatCountLabel(inspection.boxCount, inspection.countUnit)}
            </Chip>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
                {status.label}
              </span>
              {inspection.hasIssues ? <InspectionIssuesBadge /> : null}
            </span>
            <span className="text-[10px] text-white/45">{dateLabel}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
