import { resolveInspectionStatus } from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

export type InspectLifecycle = 'warehouse' | 'truck' | 'attention';

export interface InspectLifecycleDisplay {
  key: InspectLifecycle;
  label: string;
  className: string;
}

/** Warehouse-floor wording, matching the Continental Inspect mobile app. */
export function getInspectLifecycle(
  inspection: CargoInspection,
): InspectLifecycleDisplay {
  if (inspection.hasIssues) {
    return {
      key: 'attention',
      label: 'REQUIRES ATTENTION',
      className: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
    };
  }

  if (resolveInspectionStatus(inspection) === 'new') {
    return {
      key: 'warehouse',
      label: 'IN WAREHOUSE',
      className: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
    };
  }

  return {
    key: 'truck',
    label: 'ON TRUCK',
    className: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
  };
}

export interface InspectCounts {
  newCargo: number;
  loaded: number;
  requiresAttention: number;
}

export function countInspections(
  inspections: readonly CargoInspection[],
): InspectCounts {
  return inspections.reduce<InspectCounts>(
    (counts, inspection) => {
      if (inspection.hasIssues) {
        counts.requiresAttention += 1;
      }
      if (resolveInspectionStatus(inspection) === 'new') {
        counts.newCargo += 1;
      } else {
        counts.loaded += 1;
      }
      return counts;
    },
    { newCargo: 0, loaded: 0, requiresAttention: 0 },
  );
}
