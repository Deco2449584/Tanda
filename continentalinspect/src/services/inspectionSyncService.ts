import {
  createCargoInspectionRecord,
  markCargoInspectionAsLoaded,
  markCargoInspectionAsProcessed,
} from '@/services/cargoInspectionRepository';
import { deletePendingInspectionMedia } from '@/services/inspectionPendingMedia';
import {
  loadSyncQueue,
  removeSyncQueueItem,
  type PendingInspectionOperation,
} from '@/services/inspectionSyncQueue';

export type QueuedInspectionMedia = {
  inspectionId: string;
  userId: string;
  awbLabel: string;
  photoUris: string[];
  videoUris: string[];
};

export type InspectionSyncResult = {
  synced: number;
  failed: number;
  errors: string[];
  pendingMedia: QueuedInspectionMedia[];
};

async function processQueueItem(
  userId: string,
  createdByEmail: string,
  operation: PendingInspectionOperation,
): Promise<QueuedInspectionMedia | null> {
  if (operation.kind === 'create') {
    const { inspection, pendingPhotoUris, pendingVideoUris } = await createCargoInspectionRecord(
      userId,
      operation.input,
      createdByEmail,
      operation.status,
      operation.dispatchedAt,
    );

    await removeSyncQueueItem(
      userId,
      (item) => item.kind === 'create' && item.localId === operation.localId,
    );

    if (pendingPhotoUris.length === 0 && pendingVideoUris.length === 0) {
      await deletePendingInspectionMedia(operation.localId);
      return null;
    }

    return {
      inspectionId: inspection.id,
      userId,
      awbLabel: operation.input.awbNumber.trim() || inspection.uldId,
      photoUris: pendingPhotoUris,
      videoUris: pendingVideoUris,
    };
  }

  if (operation.kind === 'markProcessed') {
    await markCargoInspectionAsProcessed(operation.inspectionId);
    await removeSyncQueueItem(
      userId,
      (item) => item.kind === 'markProcessed' && item.inspectionId === operation.inspectionId,
    );
    return null;
  }

  await markCargoInspectionAsLoaded(operation.inspectionId);
  await removeSyncQueueItem(
    userId,
    (item) => item.kind === 'markLoaded' && item.inspectionId === operation.inspectionId,
  );
  return null;
}

export async function syncPendingInspections(
  userId: string,
  createdByEmail: string,
): Promise<InspectionSyncResult> {
  const queue = await loadSyncQueue(userId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];
  const pendingMedia: QueuedInspectionMedia[] = [];

  for (const operation of queue) {
    if (operation.kind === 'create' && operation.holdUntilSync) {
      continue;
    }
    try {
      const media = await processQueueItem(userId, createdByEmail, operation);
      if (media) {
        pendingMedia.push(media);
      }
      synced += 1;
    } catch (error: unknown) {
      failed += 1;
      const message =
        error instanceof Error ? error.message : 'Could not sync a pending inspection.';
      errors.push(message);
    }
  }

  return { synced, failed, errors, pendingMedia };
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  const queue = await loadSyncQueue(userId);
  return queue.length;
}
