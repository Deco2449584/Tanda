'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Bus,
  Calendar,
  Dumbbell,
  ExternalLink,
  MapPin,
  Package,
  Snowflake,
  Thermometer,
  Truck,
  User,
} from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import {
  InspectionIssuesBadge,
  InspectionLifecycleBadge,
} from '@/components/inspections/InspectionLifecycleBadge';
import { LifecycleStepper } from '@/components/inspections/LifecycleStepper';
import { InspectionPhotoGallery } from '@/components/inspections/InspectionPhotoGallery';
import { InspectionVideoGallery } from '@/components/inspections/InspectionVideoGallery';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/lib/inspections/cargo-unit-type';
import { formatInspectionDate } from '@/lib/inspections/format';
import { resolveInspectionMapsUrl } from '@/lib/inspections/inspection-maps-url';
import {
  CONSERVATION_COLORS,
  getConservationLabel,
} from '@/lib/inspections/normalize-conservation';
import { STATUS_ISSUES, getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface PortalInspectionDetailViewProps {
  inspection: CargoInspection;
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
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-[#93C5FD]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
          {label}
        </p>
        <p className="mt-0.5 text-base font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

export function PortalInspectionDetailView({
  inspection,
}: PortalInspectionDetailViewProps) {
  const detailStatus = getInspectionDetailStatus(inspection);
  const mapsUrl = resolveInspectionMapsUrl(inspection);
  const unitLabel = getUnitTypeLabel(resolveUnitType(inspection.unitType, inspection.uldId));
  const conservation = CONSERVATION_COLORS[inspection.conservationType];

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/portal/track"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to list
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#262626]/15 bg-gradient-to-br from-[#262626] to-[#4A4A4A] p-5 text-white shadow-lg md:p-6">
        <LifecycleStepper
          inspection={inspection}
          mutedBarClass="bg-white/15"
          mutedLabelClass="text-white/35"
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
          Cargo inspection
        </p>
        <div className="mt-2 flex min-w-0 items-center gap-2">
          <h1 className="font-display truncate text-2xl font-normal tracking-wide md:text-3xl">
            {getInspectionDisplayTitle(inspection)}
          </h1>
          <CopyAwbButton
            value={inspection.uldId.trim() || inspection.awbNumber}
            label="Copy identification number"
            iconOnly
            variant="onDark"
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm text-white/70">
            {unitLabel} · AWB {inspection.awbNumber}
          </p>
          <CopyAwbButton awbNumber={inspection.awbNumber} variant="onDark" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <InspectionLifecycleBadge inspection={inspection} />
          {detailStatus.hasIssues ? <InspectionIssuesBadge /> : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              <Dumbbell className="h-3.5 w-3.5 text-[#93C5FD]" aria-hidden />
              Weight
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {inspection.weightKg} kg
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
              <Package className="h-3.5 w-3.5 text-[#93C5FD]" aria-hidden />
              Boxes
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{inspection.boxCount}</p>
          </div>
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{
              backgroundColor: conservation.bg,
              borderColor: `${conservation.text}33`,
              color: conservation.text,
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

        <p className="mt-4 text-xs text-white/50">
          Registered {formatInspectionDate(inspection.registeredAt)}
          {inspection.updatedAt
            ? ` · Updated ${formatInspectionDate(inspection.updatedAt)}`
            : ''}
        </p>
      </section>

      <section className="grid gap-4 rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md sm:grid-cols-2 md:p-6">
        {inspection.clientLocationName ? (
          <DetailIconRow
            icon={Building2}
            label="Site / client"
            value={inspection.clientLocationName}
          />
        ) : null}
        <DetailIconRow icon={Package} label="Cargo type" value={unitLabel} />
        <DetailIconRow icon={Package} label="Product name" value={inspection.foodType} />
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
          <DetailIconRow icon={User} label="Driver" value={inspection.driverName} />
        ) : null}
        {inspection.transportCompany ? (
          <DetailIconRow
            icon={Truck}
            label="Transport company"
            value={inspection.transportCompany}
          />
        ) : null}
        {inspection.dispatchedAt ? (
          <DetailIconRow
            icon={Bus}
            label="Loaded on truck"
            value={formatInspectionDate(inspection.dispatchedAt)}
          />
        ) : null}
        {mapsUrl ? (
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/8 text-[#93C5FD]">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/45">
                Registration location
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#F51EA0] underline-offset-2 hover:underline"
              >
                View on map
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          </div>
        ) : null}
      </section>

      {inspection.hasIssues && (
        <section
          className="rounded-2xl border p-5 md:p-6"
          style={{
            backgroundColor: `${STATUS_ISSUES}22`,
            borderColor: `${STATUS_ISSUES}99`,
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
          <p className="mt-3 text-sm leading-relaxed text-amber-50">
            {inspection.issueDescription?.trim() || 'No description provided.'}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Photo evidence ({inspection.photoEvidence.length})
        </h2>
        <div className="mt-4 portal-gallery">
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#262626]/12 bg-[#2F2F2F] p-5 shadow-md md:p-6">
        <h2 className="text-sm font-semibold text-white">
          Video evidence ({inspection.videoEvidence.length})
        </h2>
        <div className="mt-4">
          <InspectionVideoGallery
            videos={inspection.videoEvidence}
            accessMode="link"
            theme="dark"
          />
        </div>
      </section>
    </div>
  );
}
