'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Play,
  Snowflake,
  Thermometer,
  Truck,
  User,
  X,
} from 'lucide-react';
import { CopyAwbButton } from '@/components/inspections/CopyAwbButton';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import {
  InspectionIssuesBadge,
  InspectionLifecycleBadge,
} from '@/components/inspections/InspectionLifecycleBadge';
import { LifecycleStepper } from '@/components/inspections/LifecycleStepper';
import {
  getInspectionDisplayTitle,
  getUnitTypeLabel,
  resolveUnitType,
} from '@/lib/inspections/cargo-unit-type';
import { getCountUnitLabel } from '@/lib/inspections/count-unit';
import { formatInspectionDate } from '@/lib/inspections/format';
import { resolveInspectionMapsUrl } from '@/lib/inspections/inspection-maps-url';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { STATUS_ISSUES, getInspectionDetailStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface PortalInspectionDetailViewProps {
  inspection: CargoInspection;
}

const innerCell =
  'flex min-w-0 items-center gap-4 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-4';

function hasDetailValue(value: string | null | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  const normalized = text.toLowerCase();
  return normalized !== '—' && normalized !== '-' && normalized !== 'unknown';
}

function InnerRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  if (!hasDetailValue(value)) return null;

  return (
    <div className={innerCell}>
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

type EvidenceSlide =
  | { kind: 'photo'; src: string; index: number }
  | { kind: 'video'; src: string; index: number };

function mediaFileName(url: string, fallback: string): string {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const segment = pathname.split('/').pop()?.split('?')[0];
    if (segment) return segment;
  } catch {
    // Signed URLs can be relative or malformed; use the fallback name.
  }
  return fallback;
}

async function downloadMedia(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
}

function DownloadButton({
  busy,
  onClick,
  className,
}: {
  busy: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label="Download"
      disabled={busy}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black disabled:opacity-60 ${className ?? ''}`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Download className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

function PortalEvidenceGrid({
  photos,
  videos,
}: {
  photos: string[];
  videos: string[];
}) {
  const slides: EvidenceSlide[] = [
    ...photos.map((src, index) => ({ kind: 'photo' as const, src, index })),
    ...videos.map((src, index) => ({ kind: 'video' as const, src, index })),
  ];
  const [cursor, setCursor] = useState<number | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');

  function step(delta: number) {
    setCursor((current) => {
      if (current == null || slides.length === 0) return current;
      return (current + delta + slides.length) % slides.length;
    });
  }

  useEffect(() => {
    if (cursor == null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setCursor(null);
      if (slides.length < 2) return;
      if (event.key === 'ArrowRight') {
        setCursor((current) =>
          current == null ? current : (current + 1) % slides.length,
        );
      }
      if (event.key === 'ArrowLeft') {
        setCursor((current) =>
          current == null ? current : (current - 1 + slides.length) % slides.length,
        );
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [cursor, slides.length]);

  async function saveFile(key: string, url: string, fileName: string) {
    setDownloadError('');
    setDownloadingKey(key);
    try {
      await downloadMedia(url, fileName);
    } catch {
      setDownloadError('Could not download this file. Please try again.');
    } finally {
      setDownloadingKey(null);
    }
  }

  if (photos.length === 0 && videos.length === 0) return null;

  const tileCount = slides.length;
  const active = cursor != null ? slides[cursor] : null;
  const openKey = active ? `${active.kind}-${active.index}` : null;
  const openName = active
    ? mediaFileName(
        active.src,
        active.kind === 'video'
          ? `inspection-video-${active.index + 1}.mp4`
          : `inspection-photo-${active.index + 1}.jpg`,
      )
    : '';

  const lightbox =
    active && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 sm:p-10"
            role="dialog"
            aria-modal="true"
            aria-label="Evidence"
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 cursor-default"
              onClick={() => setCursor(null)}
            />
            <div className="fixed right-4 top-4 z-[81] flex gap-2">
              <DownloadButton
                busy={downloadingKey === openKey}
                onClick={() => {
                  if (!openKey) return;
                  void saveFile(openKey, active.src, openName);
                }}
              />
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setCursor(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {slides.length > 1 ? (
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => step(-1)}
                className="fixed left-3 top-1/2 z-[81] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20 sm:left-6"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
            ) : null}

            <div className="relative z-10 overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15">
              {active.kind === 'photo' ? (
                <FirebaseImage
                  src={active.src}
                  alt={`Photo evidence ${active.index + 1}`}
                  width={1600}
                  height={1600}
                  className="!h-auto max-h-[calc(100vh-7rem)] !w-auto max-w-[min(100vw-2rem,960px)] object-contain"
                  sizes="100vw"
                  quality={85}
                />
              ) : (
                <video
                  key={active.src}
                  src={active.src}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[calc(100vh-7rem)] max-w-[min(100vw-2rem,960px)] bg-black object-contain"
                />
              )}
            </div>

            {slides.length > 1 ? (
              <button
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => step(1)}
                className="fixed right-3 top-1/2 z-[81] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/20 sm:right-6"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            ) : null}

            <p className="fixed bottom-5 left-1/2 z-[81] -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white ring-1 ring-white/15">
              {active.kind === 'video' ? 'Clip' : 'Photo'} {cursor! + 1} / {slides.length}
            </p>
            {downloadError ? (
              <p className="fixed bottom-14 left-1/2 z-[81] -translate-x-1/2 text-xs text-red-300">
                {downloadError}
              </p>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="mt-6 rounded-2xl border border-white/15 bg-white/[0.03] p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em]">
        Detailed evidence
      </h2>
      <p className="mt-1 text-sm font-normal text-white/55">
        Review photos and videos in one grid.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 auto-rows-[7.25rem] sm:grid-cols-4 sm:auto-rows-[8.5rem]">
        {photos.map((photo, index) => {
          const key = `photo-${index}`;
          const featured = index === 0;
          return (
            <div
              key={`${photo}-${index}`}
              className={`relative overflow-hidden rounded-xl border border-white/10 bg-black ${
                featured
                  ? 'col-span-2 row-span-2'
                  : tileCount === 2
                    ? 'col-span-2 sm:col-span-1 sm:row-span-2'
                    : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setCursor(index)}
                className="absolute inset-0"
                aria-label={featured ? 'Open main photo' : `Open photo ${index + 1}`}
              >
                <FirebaseImage
                  src={photo}
                  alt={featured ? 'Main photo' : `Photo evidence ${index + 1}`}
                  width={featured ? 960 : 320}
                  height={featured ? 640 : 240}
                  className="absolute inset-0 !h-full !w-full object-cover"
                  sizes={featured ? '(max-width: 768px) 100vw, 640px' : '240px'}
                  quality={70}
                />
              </button>
              <DownloadButton
                busy={downloadingKey === key}
                onClick={() =>
                  void saveFile(key, photo, mediaFileName(photo, `inspection-photo-${index + 1}.jpg`))
                }
                className="absolute right-2 top-2 z-10 !h-8 !w-8"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                {featured ? 'Main photo' : `Photo ${index + 1}`}
              </span>
            </div>
          );
        })}
        {videos.map((video, index) => {
          const key = `video-${index}`;
          const featured = photos.length === 0 && index === 0;
          const tallCompanion = photos.length === 1 && videos.length === 1 && index === 0;
          return (
            <div
              key={`${video}-${index}`}
              className={`relative overflow-hidden rounded-xl border border-white/10 bg-black ${
                featured
                  ? 'col-span-2 row-span-2'
                  : tallCompanion
                    ? 'col-span-2 sm:col-span-1 sm:row-span-2'
                    : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setCursor(photos.length + index)}
                className="absolute inset-0"
                aria-label={`Play clip ${index + 1}`}
              >
                <video
                  src={video}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover opacity-80"
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white">
                    <Play className="h-5 w-5" aria-hidden />
                  </span>
                </span>
              </button>
              <DownloadButton
                busy={downloadingKey === key}
                onClick={() =>
                  void saveFile(key, video, mediaFileName(video, `inspection-video-${index + 1}.mp4`))
                }
                className="absolute right-2 top-2 z-10 !h-8 !w-8"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                Clip {index + 1}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-normal text-white/45">
          Several views of the evidence. Select one to open the carousel.
        </p>
        <button
          type="button"
          onClick={() => setCursor(0)}
          className="shrink-0 rounded-lg bg-[#F51EA0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d4198a]"
        >
          View evidence
        </button>
      </div>
      {lightbox}
    </div>
  );
}

export function PortalInspectionDetailView({
  inspection,
}: PortalInspectionDetailViewProps) {
  const detailStatus = getInspectionDetailStatus(inspection);
  const mapsUrl = resolveInspectionMapsUrl(inspection);
  const unitLabel = getUnitTypeLabel(resolveUnitType(inspection.unitType, inspection.uldId));
  const title = getInspectionDisplayTitle(inspection);

  return (
    <div>
      <div className="relative z-10 space-y-5">
        <Link
          href="/portal/track"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-[#F51EA0]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to list
        </Link>

        <section className="portal-detail-panel rounded-3xl p-5 md:p-7">
          <LifecycleStepper
            inspection={inspection}
            mutedBarClass="bg-white/15"
            mutedLabelClass="text-white/35"
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Cargo inspection
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-3xl font-bold tracking-tight md:text-4xl">
              ID: {title}
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

          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {inspection.weightKg > 0 ? (
              <InnerRow
                icon={Dumbbell}
                label="Weight"
                value={`${inspection.weightKg} kg`}
              />
            ) : null}
            {inspection.boxCount > 0 ? (
              <InnerRow
                icon={Package}
                label={getCountUnitLabel(inspection.countUnit, inspection.boxCount)}
                value={String(inspection.boxCount)}
              />
            ) : null}
            <InnerRow
              icon={Snowflake}
              label="Cold chain"
              value={getConservationLabel(inspection.conservationType)}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <InnerRow icon={Package} label="Cargo type" value={unitLabel} />
            <InnerRow icon={Package} label="Product name" value={inspection.foodType} />
            {typeof inspection.temperatureCelsius === 'number' ? (
              <InnerRow
                icon={Thermometer}
                label="Temperature"
                value={`${inspection.temperatureCelsius} °C`}
              />
            ) : null}
            {inspection.exitVehiclePlate ? (
              <InnerRow
                icon={Truck}
                label="Exit vehicle plate"
                value={inspection.exitVehiclePlate}
              />
            ) : null}
            {inspection.driverName ? (
              <InnerRow icon={User} label="Driver" value={inspection.driverName} />
            ) : null}
            {inspection.transportCompany ? (
              <InnerRow
                icon={Truck}
                label="Transport company"
                value={inspection.transportCompany}
              />
            ) : null}
            {inspection.dispatchedAt ? (
              <InnerRow
                icon={Bus}
                label="Loaded on truck"
                value={formatInspectionDate(inspection.dispatchedAt)}
              />
            ) : null}
            {mapsUrl ? (
              <div className={innerCell}>
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
          </div>

          {inspection.hasIssues ? (
            <div
              className="mt-4 rounded-xl border p-4"
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
            </div>
          ) : null}

          <PortalEvidenceGrid
            photos={inspection.photoEvidence}
            videos={inspection.videoEvidence}
          />
        </section>
      </div>
    </div>
  );
}
