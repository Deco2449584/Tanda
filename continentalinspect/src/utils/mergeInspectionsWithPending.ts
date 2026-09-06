import type { CargoInspection } from '@/types';
import {
  pendingCreateToInspection,
  type PendingInspectionOperation,
} from '@/services/inspectionSyncQueue';

function sortByNewest(inspections: CargoInspection[]): CargoInspection[] {
  return [...inspections].sort(
    (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}

export function mergeInspectionsWithPending(
  remote: readonly CargoInspection[],
  queue: readonly PendingInspectionOperation[],
): CargoInspection[] {
  const merged = new Map<string, CargoInspection>();

  for (const inspection of remote) {
    merged.set(inspection.id, {
      ...inspection,
      syncStatus: inspection.syncStatus ?? 'synced',
    });
  }

  for (const operation of queue) {
    if (operation.kind === 'create') {
      merged.set(operation.localId, pendingCreateToInspection(operation));
      continue;
    }

    const existing = merged.get(operation.inspectionId);
    if (existing) {
      merged.set(operation.inspectionId, {
        ...existing,
        status: 'loaded',
        syncStatus: 'pending',
        updatedAt: operation.dispatchedAt,
        dispatchedAt: operation.dispatchedAt,
      });
    }
  }

  return sortByNewest([...merged.values()]);
}
