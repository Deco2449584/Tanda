import type {
  CargoInspection,
  CargoInspectionStatus,
} from '@/lib/types/cargo-inspection';

export type InspectionListStatusLabel = 'Identification' | 'Processed' | 'On truck';

export type InspectionStatusKind = 'identification' | 'processed' | 'loaded';

export interface InspectionStatusDisplay {
  label: InspectionListStatusLabel;
  kind: InspectionStatusKind;
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

export function getInspectionListStatus(
  inspection: Pick<CargoInspection, 'status'>,
): InspectionStatusDisplay {
  const status = resolveInspectionStatus(inspection);

  if (status === 'processed') {
    return {
      label: 'Processed',
      kind: 'processed',
      className: 'bg-teal-500/20 text-teal-200 ring-1 ring-teal-400/30',
    };
  }

  if (status === 'loaded') {
    return {
      label: 'On truck',
      kind: 'loaded',
      className: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30',
    };
  }

  return {
    label: 'Identification',
    kind: 'identification',
    className: 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/30',
  };
}

export function getInspectionDetailStatus(inspection: CargoInspection): {
  status: CargoInspectionStatus;
  lifecycleLabel: InspectionListStatusLabel;
  lifecycleClassName: string;
  hasIssues: boolean;
} {
  const display = getInspectionListStatus(inspection);
  return {
    status: display.kind === 'loaded' ? 'loaded' : display.kind,
    lifecycleLabel: display.label,
    lifecycleClassName: display.className,
    hasIssues: inspection.hasIssues,
  };
}
