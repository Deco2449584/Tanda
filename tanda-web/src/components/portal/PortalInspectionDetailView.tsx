'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeft,
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
import { FirebaseImage } from '@/components/ui/FirebaseImage';
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
import { getCountUnitLabel } from '@/lib/inspections/count-unit';
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

function hasDetailValue(value: string | null | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return normalized !== '—' && normalized !== '-' && normalized !== 'unknown';
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
  if (!hasDetailValue(value)) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl portal-glass px-4 py-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="pr-[0.12em] text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-white/45">
          {label}
        </p>
        <p className="mt-1.5 text-base font-bold leading-5 text-white">{value}</p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-2xl portal-glass px-5 py-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="pr-[0.12em] text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-white/45">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold leading-tight">{value}</p>
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
  const coverPhoto = inspection.photoEvidence[0];

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/portal/track"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-[#F51EA0]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to list
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl portal-glass">
        {coverPhoto ? (
          <div className="relative h-44 md:h-56">
            <FirebaseImage
              src={coverPhoto}
              alt=""
              width={1200}
              height={420}
              priority
              className="h-full w-full object-cover"
              sizes="(max-width: 768px) 100vw, 960px"
              quality={80}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/10" />
          </div>
        ) : null}
        <div className="px-5 py-6 md:px-6">
          <LifecycleStepper
            inspection={inspection}
            mutedBarClass="bg-white/15"
            mutedLabelClass="text-white/35"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#F51EA0]">
            Cargo inspection
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-3xl font-bold tracking-tight md:text-4xl">
              {getInspectionDisplayTitle(inspection)}
            </h1>
            <CopyAwbButton
              value={inspection.uldId.trim() || inspection.awbNumber}
              label="Copy identification number"
              iconOnly
              variant="onDark"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-normal text-white/75">
              {unitLabel} · AWB {inspection.awbNumber}
            </p>
            <CopyAwbButton awbNumber={inspection.awbNumber} variant="onDark" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <InspectionLifecycleBadge inspection={inspection} />
            {detailStatus.hasIssues ? <InspectionIssuesBadge /> : null}
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs font-normal text-white/50">
            <Calendar className="h-3.5 w-3.5 text-[#F51EA0]" aria-hidden />
            Registered {formatInspectionDate(inspection.registeredAt)}
            {inspection.updatedAt
              ? ` · Updated ${formatInspectionDate(inspection.updatedAt)}`
              : ''}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inspection.weightKg > 0 ? (
          <MetricCard
            icon={Dumbbell}
            label="Weight"
            value={`${inspection.weightKg} kg`}
          />
        ) : null}
        {inspection.boxCount > 0 ? (
          <MetricCard
            icon={Package}
            label={getCountUnitLabel(inspection.countUnit, inspection.boxCount)}
            value={String(inspection.boxCount)}
          />
        ) : null}
        <div
          className="flex min-w-0 items-center gap-4 rounded-2xl border px-5 py-5"
          style={{
            backgroundColor: conservation.bg,
            borderColor: `${conservation.text}55`,
            color: conservation.text,
          }}
        >
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: `${conservation.text}88` }}
          >
            <Snowflake className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="pr-[0.12em] text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] opacity-70">
              Cold chain
            </p>
            <p className="mt-2 text-2xl font-bold leading-tight">
              {getConservationLabel(inspection.conservationType)}
            </p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
          <div className="flex items-center gap-4 rounded-2xl portal-glass px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F51EA0]/60 text-[#F51EA0]">
              <MapPin className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="pr-[0.12em] text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-white/45">
                Registration location
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-bold leading-5 text-[#F51EA0] underline-offset-2 hover:underline"
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

      <section className="rounded-2xl portal-glass p-5 md:p-6">
        <h2 className="text-lg font-bold">
          Photo <span className="text-[#F51EA0]">evidence</span>
          <span className="ml-2 text-sm font-normal text-white/45">
            ({inspection.photoEvidence.length})
          </span>
        </h2>
        <div className="mt-4 portal-gallery">
          <InspectionPhotoGallery photos={inspection.photoEvidence} />
        </div>
      </section>

      {inspection.videoEvidence.length > 0 ? (
      <section className="rounded-2xl portal-glass p-5 md:p-6">
        <h2 className="text-lg font-bold">
          Video <span className="text-[#F51EA0]">evidence</span>
          <span className="ml-2 text-sm font-normal text-white/45">
            ({inspection.videoEvidence.length})
          </span>
        </h2>
        <div className="mt-4">
          <InspectionVideoGallery
            videos={inspection.videoEvidence}
            accessMode="link"
            theme="dark"
          />
        </div>
      </section>
      ) : null}
    </div>
  );
}
