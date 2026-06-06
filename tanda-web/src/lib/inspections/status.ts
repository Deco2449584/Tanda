import type {
  CargoInspection,
  CargoInspectionStatus,
} from '@/lib/types/cargo-inspection';

export type InspectionListStatusLabel = 'NEW' | 'LOADED' | 'REQUIRES ATTENTION';

export interface InspectionStatusDisplay {
  label: InspectionListStatusLabel;
  className: string;
}

export function normalizeInspectionStatus(
  value: string | undefined,
): CargoInspectionStatus {
  const raw = value?.trim().toLowerCase();
  if (raw === 'new' || raw === 'loaded') {
    return raw;
  }
  return 'loaded';
}

export function resolveInspectionStatus(
  inspection: CargoInspection,
): CargoInspectionStatus {
  return normalizeInspectionStatus(inspection.status);
}

export function getInspectionListStatus(
  inspection: CargoInspection,
): InspectionStatusDisplay {
  if (inspection.hasIssues) {
    return {
      label: 'REQUIRES ATTENTION',
      className: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    };
  }

  if (resolveInspectionStatus(inspection) === 'new') {
    return {
      label: 'NEW',
      className: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    };
  }

  return {
    label: 'LOADED',
    className: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
  };
}

export function getInspectionDetailStatus(
  inspection: CargoInspection,
): {
  showLifecycleBadge: boolean;
  lifecycleLabel?: string;
  lifecycleClassName?: string;
  isFullyLoaded: boolean;
  isNewInWarehouse: boolean;
} {
  const operationalStatus = resolveInspectionStatus(inspection);
  const isNewInWarehouse = operationalStatus === 'new';
  const isFullyLoaded = operationalStatus === 'loaded' && !inspection.hasIssues;

  if (inspection.hasIssues) {
    return {
      showLifecycleBadge: true,
      lifecycleLabel: 'REQUIRES ATTENTION',
      lifecycleClassName: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
      isFullyLoaded: false,
      isNewInWarehouse,
    };
  }

  if (isNewInWarehouse) {
    return {
      showLifecycleBadge: true,
      lifecycleLabel: 'NEW IN WAREHOUSE',
      lifecycleClassName: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
      isFullyLoaded: false,
      isNewInWarehouse: true,
    };
  }

  return {
    showLifecycleBadge: false,
    isFullyLoaded,
    isNewInWarehouse: false,
  };
}
