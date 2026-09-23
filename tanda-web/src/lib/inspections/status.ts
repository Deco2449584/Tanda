import type {
  CargoInspection,
  CargoInspectionStatus,
} from '@/lib/types/cargo-inspection';

export const STATUS_IDENTIFICATION = '#2563EB';
export const STATUS_PROCESSED = '#0D9488';
export const STATUS_LOADED = '#4F46E5';
export const STATUS_ISSUES = '#F59E0B';

export type InspectionListStatusLabel = 'Identification' | 'Processed' | 'On truck';

export type InspectionStatusKind = 'identification' | 'processed' | 'loaded';

export interface InspectionStatusDisplay {
  label: InspectionListStatusLabel;
  kind: InspectionStatusKind;
  color: string;
  className: string;
}

export function formatPersonName(
  name: string | undefined,
  email: string | undefined,
): string {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail;
  return 'Unknown';
}

export function normalizeInspectionStatus(
  value: string | undefined,
): CargoInspectionStatus {
  const raw = value?.trim().toLowerCase();
  if (raw === 'identification' || raw === 'new' || raw === 'in warehouse') {
    return 'identification';
  }
  if (raw === 'processed' || raw === 'processing') {
    return 'processed';
  }
  if (raw === 'loaded' || raw === 'on truck') {
    return 'loaded';
  }
  return 'identification';
}

export function resolveInspectionStatus(
  inspection: Pick<CargoInspection, 'status'>,
): CargoInspectionStatus {
  return normalizeInspectionStatus(inspection.status);
}

export function getStatusColor(kind: InspectionStatusKind): string {
  if (kind === 'processed') return STATUS_PROCESSED;
  if (kind === 'loaded') return STATUS_LOADED;
  return STATUS_IDENTIFICATION;
}

export function statusTint(hex: string): string {
  return `${hex}22`;
}

export function statusBadgeClassName(hex: string): string {
  return `inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1`;
}

export function statusBadgeStyle(hex: string): {
  color: string;
  backgroundColor: string;
  boxShadow: string;
} {
  return {
    color: hex,
    backgroundColor: statusTint(hex),
    boxShadow: `inset 0 0 0 1px ${hex}4D`,
  };
}

export const ISSUES_BADGE_CLASS =
  'inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1';

export const ISSUES_BADGE_STYLE = statusBadgeStyle(STATUS_ISSUES);

export function getInspectionListStatus(
  inspection: Pick<CargoInspection, 'status'>,
): InspectionStatusDisplay {
  const status = resolveInspectionStatus(inspection);
  const color = getStatusColor(status);
  const label: InspectionListStatusLabel =
    status === 'processed'
      ? 'Processed'
      : status === 'loaded'
        ? 'On truck'
        : 'Identification';

  return {
    label,
    kind: status,
    color,
    className: statusBadgeClassName(color),
  };
}

export function getInspectionDetailStatus(inspection: CargoInspection): {
  status: CargoInspectionStatus;
  lifecycleLabel: InspectionListStatusLabel;
  lifecycleClassName: string;
  lifecycleColor: string;
  hasIssues: boolean;
} {
  const display = getInspectionListStatus(inspection);
  return {
    status: display.kind,
    lifecycleLabel: display.label,
    lifecycleClassName: display.className,
    lifecycleColor: display.color,
    hasIssues: inspection.hasIssues,
  };
}
