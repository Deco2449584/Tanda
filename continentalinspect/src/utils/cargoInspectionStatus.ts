import type { CargoInspection, CargoInspectionStatus, InspectionSyncStatus } from '@/types';
import { filterInspectionsToday } from '@/utils/filterInspections';

export const STATUS_IDENTIFICATION = '#2563EB';
export const STATUS_PROCESSED = '#0D9488';
export const STATUS_LOADED = '#4F46E5';
export const STATUS_ISSUES = '#F59E0B';

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

export function resolveInspectionStatus(inspection: CargoInspection): CargoInspectionStatus {
  return normalizeInspectionStatus(inspection.status);
}

export type InspectionDisplayBadgeKind = 'identification' | 'processed' | 'truck';

export type InspectionDisplayBadge = {
  label: string;
  kind: InspectionDisplayBadgeKind;
  color: string;
};

export function getLifecycleBadge(status: CargoInspectionStatus): InspectionDisplayBadge {
  if (status === 'processed') {
    return { label: 'Processed', kind: 'processed', color: STATUS_PROCESSED };
  }
  if (status === 'loaded') {
    return { label: 'On Truck', kind: 'truck', color: STATUS_LOADED };
  }
  return { label: 'Identification', kind: 'identification', color: STATUS_IDENTIFICATION };
}

/** Lifecycle label only. Issues and sync are independent badges. */
export function getInspectionDisplayBadge(inspection: CargoInspection): InspectionDisplayBadge {
  return getLifecycleBadge(resolveInspectionStatus(inspection));
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

export function getInspectionStatusExportLabel(inspection: CargoInspection): string {
  return getInspectionDisplayBadge(inspection).label;
}

export type SyncBadge = {
  label: string;
  kind: InspectionSyncStatus;
};

export function getSyncBadge(syncStatus: InspectionSyncStatus | undefined): SyncBadge {
  if (syncStatus === 'local') {
    return { label: 'Saved locally', kind: 'local' };
  }
  if (syncStatus === 'pending') {
    return { label: 'Pending sync', kind: 'pending' };
  }
  if (syncStatus === 'error') {
    return { label: 'Sync error', kind: 'error' };
  }
  return { label: 'Uploaded', kind: 'synced' };
}

export type TodayDashboardMetrics = {
  identification: number;
  processed: number;
  loaded: number;
  requiresAttention: number;
};

export function countTodayDashboardMetrics(
  inspections: CargoInspection[],
): TodayDashboardMetrics {
  const today = filterInspectionsToday(inspections);

  let identification = 0;
  let processed = 0;
  let loaded = 0;
  let requiresAttention = 0;

  for (const inspection of today) {
    const status = resolveInspectionStatus(inspection);
    if (status === 'identification') {
      identification += 1;
    } else if (status === 'processed') {
      processed += 1;
    } else if (status === 'loaded') {
      loaded += 1;
    }
    if (inspection.hasIssues) {
      requiresAttention += 1;
    }
  }

  return { identification, processed, loaded, requiresAttention };
}
