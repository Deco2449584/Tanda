import {
  createCargoInspection,
  markCargoInspectionAsLoaded,
} from '@/services/cargoInspectionRepository';
import { deletePendingInspectionMedia } from '@/services/inspectionPendingMedia';
import {
  loadSyncQueue,
  removeSyncQueueItem,
  type PendingInspectionOperation,
} from '@/services/inspectionSyncQueue';

export type InspectionSyncResult = {
  synced: number;
  failed: number;
  errors: string[];
};

async function processQueueItem(
  userId: string,
  createdByEmail: string,
  operation: PendingInspectionOperation,
): Promise<void> {
  if (operation.kind === 'create') {
    const inspection = await createCargoInspection(userId, operation.input, createdByEmail);

    if (operation.status === 'loaded') {
      await markCargoInspectionAsLoaded(inspection.id);
    }

    await deletePendingInspectionMedia(operation.localId);
    await removeSyncQueueItem(
      userId,
      (item) => item.kind === 'create' && item.localId === operation.localId,
    );
    return;
  }

  await markCargoInspectionAsLoaded(operation.inspectionId);
  await removeSyncQueueItem(
    userId,
    (item) => item.kind === 'markLoaded' && item.inspectionId === operation.inspectionId,
  );
}

export async function syncPendingInspections(
  userId: string,
  createdByEmail: string,
): Promise<InspectionSyncResult> {
  const queue = await loadSyncQueue(userId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const operation of queue) {
    try {
      await processQueueItem(userId, createdByEmail, operation);
      synced += 1;
    } catch (error: unknown) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : 'Could not sync a pending inspection.';
      errors.push(message);
    }
  }

  return { synced, failed, errors };
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  const queue = await loadSyncQueue(userId);
  return queue.length;
}
