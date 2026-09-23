import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Dumbbell, Package, Paperclip } from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import {
  InspectionIssuesBadge,
  InspectionLifecycleBadge,
} from '@/components/inspections/InspectionLifecycleBadge';
import {
  getInspectionDisplayTitle,
  getUnitTypeIcon,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/lib/inspections/cargo-unit-type';
import { formatInspectionDate } from '@/lib/inspections/format';
import {
  CONSERVATION_COLORS,
  getConservationLabel,
} from '@/lib/inspections/normalize-conservation';
import { getInspectionListStatus, statusTint } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionCardProps {
  inspection: CargoInspection;
}

function Chip({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] font-semibold text-subtle"
      style={color ? { color } : undefined}
    >
      {children}
    </span>
  );
}

export function InspectionCard({ inspection }: InspectionCardProps) {
  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;
  const status = getInspectionListStatus(inspection);
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  const UnitIcon = getUnitTypeIcon(unitType);
  const conservation = CONSERVATION_COLORS[inspection.conservationType];
  const title = getInspectionDisplayTitle(inspection);
  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);
  const clientInitial = (inspection.clientLocationName?.trim() || 'C').slice(0, 1).toUpperCase();
  const identificationNumber = inspection.uldId.trim() || inspection.awbNumber;

  return (
    <Link
      href={`/inspections/${inspection.id}`}
      className="group flex overflow-hidden rounded-[22px] bg-surface-raised shadow-sm transition-colors hover:bg-surface-hover"
    >
      <div className="w-[3px] shrink-0" style={{ backgroundColor: status.color }} aria-hidden />

      <div className="flex min-w-0 flex-1 gap-3 p-3.5">
        {thumbUri ? (
          <FirebaseImage
            src={thumbUri}
            alt={title}
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-xl object-cover"
            sizes="52px"
            quality={70}
          />
        ) : (
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: statusTint(status.color) }}
          >
            <Package className="h-5 w-5" style={{ color: status.color }} aria-hidden />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <p className="truncate text-base font-semibold text-foreground">{title}</p>
                <CopyAwbButton
                  value={identificationNumber}
                  label="Copy identification number"
                  iconOnly
                />
              </div>
              <p className="truncate text-xs text-subtle">AWB {inspection.awbNumber}</p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-subtle transition group-hover:text-muted"
              aria-hidden
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip color={status.color}>
              <UnitIcon className="h-3 w-3" aria-hidden />
              {getUnitTypeLabel(unitType)}
            </Chip>
            {inspection.foodType.trim() ? (
              <Chip color={status.color}>{inspection.foodType}</Chip>
            ) : null}
            <Chip color={conservation.text}>
              {getConservationLabel(inspection.conservationType)}
            </Chip>
            <Chip>
              <Dumbbell className="h-3 w-3" aria-hidden />
              {inspection.weightKg} kg
            </Chip>
            <Chip>
              <Package className="h-3 w-3" aria-hidden />
              {inspection.boxCount} boxes
            </Chip>
            {inspection.clientLocationName?.trim() ? (
              <Chip>
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-600 text-[8px] text-white">
                  {clientInitial}
                </span>
                {inspection.clientLocationName}
              </Chip>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <InspectionLifecycleBadge inspection={inspection} />
              {inspection.hasIssues ? <InspectionIssuesBadge /> : null}
              {inspection.portalEnabled ? (
                <span className="inline-flex rounded-md bg-violet-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-300 ring-1 ring-violet-500/30">
                  Portal
                </span>
              ) : null}
            </div>

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
  );
}
