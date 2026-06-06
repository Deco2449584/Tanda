import Link from 'next/link';
import { ChevronRight, Package, Paperclip } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import { formatInspectionDate } from '@/lib/inspections/format';
import { getInspectionListStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectionCardProps {
  inspection: CargoInspection;
}

export function InspectionCard({ inspection }: InspectionCardProps) {
  const thumbUri = inspection.photoEvidence[0] ?? null;
  const mediaCount =
    inspection.photoEvidence.length + inspection.videoEvidence.length;
  const status = getInspectionListStatus(inspection);
  const dateLabel = inspection.updatedAt
    ? formatInspectionDate(inspection.updatedAt)
    : formatInspectionDate(inspection.registeredAt);

  return (
    <Link
      href={`/inspections/${inspection.id}`}
      className="group flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="w-1 shrink-0 bg-primary" aria-hidden />

      <div className="flex min-w-0 flex-1 gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800">
          {thumbUri ? (
            <FirebaseImage
              src={thumbUri}
              alt={`ULD ${inspection.uldId}`}
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
              <p className="truncate text-base font-semibold text-white">
                {inspection.uldId}
              </p>
              <p className="truncate text-xs text-zinc-500">
                AWB {inspection.awbNumber}
              </p>
            </div>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:text-zinc-400"
              aria-hidden
            />
          </div>

          <p className="mt-1 truncate text-sm text-zinc-300">
            {inspection.foodType}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {getConservationLabel(inspection.conservationType)} ·{' '}
            {inspection.weightKg} kg · {inspection.boxCount} boxes
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${status.className}`}
            >
              {status.label}
            </span>

            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              {mediaCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Paperclip className="h-3 w-3" aria-hidden />
                  {mediaCount}
                </span>
              )}
              <span>{dateLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
