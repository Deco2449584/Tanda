import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CargoInspection,
  CargoInspectionStatus,
  NewCargoInspectionInput,
} from '@/types';
import { resolveUnitType } from '@/utils/cargoUnitType';
import { normalizeUldId } from '@/utils/uldId';

const QUEUE_PREFIX = '@continentalinspect/sync_queue:';

export type PendingCreateOperation = {
  kind: 'create';
  localId: string;
  userId: string;
  createdBy: string;
  input: NewCargoInspectionInput;
  status: CargoInspectionStatus;
  registeredAt: string;
  dispatchedAt?: string;
  enqueuedAt: string;
  retryCount: number;
  lastError?: string;
};

export type PendingMarkLoadedOperation = {
  kind: 'markLoaded';
  inspectionId: string;
  dispatchedAt: string;
  enqueuedAt: string;
  retryCount: number;
  lastError?: string;
};

export type PendingInspectionOperation = PendingCreateOperation | PendingMarkLoadedOperation;

function queueKey(userId: string): string {
  return `${QUEUE_PREFIX}${userId}`;
}

export function createLocalInspectionId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadSyncQueue(userId: string): Promise<PendingInspectionOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(queueKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingInspectionOperation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveSyncQueue(
  userId: string,
  operations: readonly PendingInspectionOperation[],
): Promise<void> {
  await AsyncStorage.setItem(queueKey(userId), JSON.stringify(operations));
}

export async function enqueuePendingCreate(
  userId: string,
  operation: Omit<PendingCreateOperation, 'kind' | 'enqueuedAt' | 'retryCount'>,
): Promise<PendingCreateOperation> {
  const queue = await loadSyncQueue(userId);
  const entry: PendingCreateOperation = {
    kind: 'create',
    ...operation,
    enqueuedAt: new Date().toISOString(),
    retryCount: 0,
  };
  await saveSyncQueue(userId, [...queue, entry]);
  return entry;
}

export async function enqueuePendingMarkLoaded(
  userId: string,
  inspectionId: string,
): Promise<PendingMarkLoadedOperation> {
  const queue = await loadSyncQueue(userId);
  const withoutDuplicate = queue.filter(
    (item) => !(item.kind === 'markLoaded' && item.inspectionId === inspectionId),
  );
  const dispatchedAt = new Date().toISOString();
  const entry: PendingMarkLoadedOperation = {
    kind: 'markLoaded',
    inspectionId,
    dispatchedAt,
    enqueuedAt: dispatchedAt,
    retryCount: 0,
  };
  await saveSyncQueue(userId, [...withoutDuplicate, entry]);
  return entry;
}

export async function updatePendingCreateStatus(
  userId: string,
  localId: string,
  status: CargoInspectionStatus,
  dispatchedAt?: string,
): Promise<void> {
  const queue = await loadSyncQueue(userId);
  const next = queue.map((item) => {
    if (item.kind !== 'create' || item.localId !== localId) {
      return item;
    }

    if (status !== 'loaded') {
      return { ...item, status };
    }

    const nextDispatchedAt = dispatchedAt ?? new Date().toISOString();
    return { ...item, status, dispatchedAt: nextDispatchedAt };
  });
  await saveSyncQueue(userId, next);
}

export async function removeSyncQueueItem(
  userId: string,
  predicate: (item: PendingInspectionOperation) => boolean,
): Promise<void> {
  const queue = await loadSyncQueue(userId);
  await saveSyncQueue(
    userId,
    queue.filter((item) => !predicate(item)),
  );
}

export async function markSyncQueueItemError(
  userId: string,
  predicate: (item: PendingInspectionOperation) => boolean,
  message: string,
): Promise<void> {
  const queue = await loadSyncQueue(userId);
  const next = queue.map((item) =>
    predicate(item)
      ? { ...item, retryCount: item.retryCount + 1, lastError: message }
      : item,
  );
  await saveSyncQueue(userId, next);
}

export function pendingCreateToInspection(operation: PendingCreateOperation): CargoInspection {
  const issueDescription = operation.input.hasIssues
    ? operation.input.issueDescription?.trim()
    : undefined;

  return {
    id: operation.localId,
    unitType: resolveUnitType(operation.input.unitType, operation.input.uldId),
    uldId: normalizeUldId(operation.input.uldId),
    awbNumber: operation.input.awbNumber.trim(),
    conservationType: operation.input.conservationType,
    foodType: operation.input.foodType.trim(),
    weightKg: operation.input.weightKg,
    boxCount: operation.input.boxCount,
    status: operation.status,
    hasIssues: operation.input.hasIssues,
    issueDescription: issueDescription || undefined,
    photoEvidence: operation.input.photoEvidence,
    videoEvidence: operation.input.videoEvidence,
    registeredAt: operation.registeredAt,
    updatedAt: operation.status === 'loaded' ? operation.dispatchedAt : undefined,
    dispatchedAt: operation.status === 'loaded' ? operation.dispatchedAt : undefined,
    createdBy: operation.createdBy,
    syncStatus: 'pending',
    clientLocationId: operation.input.clientLocationId,
    clientLocationName: operation.input.clientLocationName,
    portalClientId: operation.input.portalClientId ?? operation.input.clientLocationId,
    registeredLatitude: operation.input.registeredLatitude,
    registeredLongitude: operation.input.registeredLongitude,
    registeredAccuracyMeters: operation.input.registeredAccuracyMeters,
    registeredLocationAt: operation.input.registeredLocationAt,
    registeredMapsUrl: operation.input.registeredMapsUrl,
    temperatureCelsius: operation.input.temperatureCelsius,
    exitVehiclePlate: operation.input.exitVehiclePlate,
    driverName: operation.input.driverName,
    transportCompany: operation.input.transportCompany,
    issueReportedAt: operation.input.hasIssues
      ? operation.input.issueReportedAt ?? operation.registeredAt
      : operation.input.issueReportedAt,
  };
}

export function countPendingSyncOperations(queue: readonly PendingInspectionOperation[]): number {
  return queue.length;
}

export function findPendingCreateByUldId(
  queue: readonly PendingInspectionOperation[],
  uldId: string,
): PendingCreateOperation | null {
  const key = normalizeUldId(uldId);
  if (!key) {
    return null;
  }
  for (const item of queue) {
    if (item.kind === 'create' && normalizeUldId(item.input.uldId) === key) {
      return item;
    }
  }
  return null;
}
