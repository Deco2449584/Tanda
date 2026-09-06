import {
  Timestamp,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  uploadCargoInspectionPhotos,
  uploadCargoInspectionVideos,
} from '@/services/cargoInspectionStorage';
import { db } from '@/services/firebaseConfig';
import type {
    CargoInspection,
    CargoInspectionStatus,
    CargoUnitType,
    ConservationType,
    NewCargoInspectionInput,
    UpdateCargoInspectionInput,
} from '@/types';
import { normalizeConservationType } from '@/types';
import { normalizeInspectionStatus } from '@/utils/cargoInspectionStatus';
import { resolveUnitType } from '@/utils/cargoUnitType';
import { isRemoteMediaUri } from '@/utils/evidenceMediaValidation';
import { hasUldId, normalizeUldId } from '@/utils/uldId';

export const CARGO_INSPECTIONS_COLLECTION = 'cargo_inspections';

export type CargoInspectionDocument = {
  userId: string;
  unitType?: CargoUnitType | string;
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType;
  foodType: string;
  weightKg: number;
  boxCount: number;
  hasIssues: boolean;
  status?: CargoInspectionStatus | string;
  issueDescription: string;
  photoEvidence: string[];
  videoEvidence: string[];
  createdBy: string;
  registeredAt: Timestamp | string;
  registeredAtIso?: string;
  updatedAt?: Timestamp | string;
  updatedAtIso?: string;
  dispatchedAt?: Timestamp | string;
  dispatchedAtIso?: string;
  clientLocationId?: string;
  clientLocationName?: string;
  portalClientId?: string;
  registeredLatitude?: number;
  registeredLongitude?: number;
  registeredAccuracyMeters?: number;
  registeredLocationAt?: string;
  registeredMapsUrl?: string;
};

function timestampToIso(value: Timestamp | string | undefined): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

function toDisplayIso(
  primary?: Timestamp | string,
  fallbackIso?: string,
): string {
  const fromPrimary = timestampToIso(primary);
  if (fromPrimary) return fromPrimary;
  if (fallbackIso) return fallbackIso;
  return new Date(0).toISOString();
}

function sortByNewest(inspections: CargoInspection[]): CargoInspection[] {
  return [...inspections].sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}

function mapDocumentToCargoInspection(
  id: string,
  data: CargoInspectionDocument,
): CargoInspection {
  const issueDescription = data.issueDescription?.trim();
  const status = normalizeInspectionStatus(data.status);
  const dispatchedAtIso =
    timestampToIso(data.dispatchedAt) ??
    data.dispatchedAtIso ??
    (status === 'loaded' ? timestampToIso(data.updatedAt) ?? data.updatedAtIso : undefined);

  return {
    id,
    unitType: resolveUnitType(data.unitType, data.uldId),
    uldId: data.uldId,
    awbNumber: data.awbNumber,
    conservationType: normalizeConservationType(
      data.conservationType as string | undefined,
    ),
    foodType: data.foodType,
    weightKg: data.weightKg ?? 0,
    boxCount: data.boxCount ?? 0,
    hasIssues: Boolean(data.hasIssues),
    status,
    issueDescription: issueDescription || undefined,
    photoEvidence: data.photoEvidence ?? [],
    videoEvidence: data.videoEvidence ?? [],
    registeredAt: toDisplayIso(data.registeredAt, data.registeredAtIso),
    updatedAt: timestampToIso(data.updatedAt) ?? data.updatedAtIso,
    dispatchedAt: dispatchedAtIso,
    createdBy: data.createdBy ?? '',
    clientLocationId: data.clientLocationId?.trim() || undefined,
    clientLocationName: data.clientLocationName?.trim() || undefined,
    portalClientId: data.portalClientId?.trim() || undefined,
    registeredLatitude:
      typeof data.registeredLatitude === 'number' ? data.registeredLatitude : undefined,
    registeredLongitude:
      typeof data.registeredLongitude === 'number' ? data.registeredLongitude : undefined,
    registeredAccuracyMeters:
      typeof data.registeredAccuracyMeters === 'number'
        ? data.registeredAccuracyMeters
        : undefined,
    registeredLocationAt: data.registeredLocationAt?.trim() || undefined,
    registeredMapsUrl: data.registeredMapsUrl?.trim() || undefined,
  };
}

function buildFirestorePayload(
  input: NewCargoInspectionInput | UpdateCargoInspectionInput,
  photoEvidence: string[],
  videoEvidence: string[],
  createdBy: string,
  status: CargoInspectionStatus,
): Omit<CargoInspectionDocument, 'registeredAt' | 'registeredAtIso' | 'updatedAt' | 'updatedAtIso' | 'userId'> {
  const issueDescription = input.hasIssues ? (input.issueDescription ?? '').trim() : '';
  const uldId = normalizeUldId(input.uldId);
  const clientLocationId = input.clientLocationId?.trim() ?? '';
  const clientLocationName = input.clientLocationName?.trim() ?? '';
  return {
    unitType: input.unitType,
    uldId,
    awbNumber: input.awbNumber.trim(),
    conservationType: input.conservationType,
    foodType: input.foodType.trim(),
    weightKg: input.weightKg,
    boxCount: input.boxCount,
    hasIssues: input.hasIssues,
    status,
    issueDescription,
    photoEvidence,
    videoEvidence,
    createdBy,
    ...(clientLocationId
      ? {
          clientLocationId,
          clientLocationName,
          portalClientId: clientLocationId,
        }
      : {}),
    ...(typeof input.registeredLatitude === 'number'
      ? { registeredLatitude: input.registeredLatitude }
      : {}),
    ...(typeof input.registeredLongitude === 'number'
      ? { registeredLongitude: input.registeredLongitude }
      : {}),
    ...(typeof input.registeredAccuracyMeters === 'number'
      ? { registeredAccuracyMeters: input.registeredAccuracyMeters }
      : {}),
    ...(input.registeredLocationAt?.trim()
      ? { registeredLocationAt: input.registeredLocationAt.trim() }
      : {}),
    ...(input.registeredMapsUrl?.trim()
      ? { registeredMapsUrl: input.registeredMapsUrl.trim() }
      : {}),
  };
}

export function findCargoInspectionByUldId(
  inspections: CargoInspection[],
  uldId: string,
): CargoInspection | null {
  const key = normalizeUldId(uldId);
  if (!hasUldId(key)) {
    return null;
  }
  return inspections.find((item) => normalizeUldId(item.uldId) === key) ?? null;
}

export async function fetchCargoInspectionByUldId(
  uldId: string,
): Promise<CargoInspection | null> {
  if (!db) {
    return null;
  }

  const normalized = normalizeUldId(uldId);
  const snapshot = await getDocs(
    query(
      collection(db, CARGO_INSPECTIONS_COLLECTION),
      where('uldId', '==', normalized),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];
  return mapDocumentToCargoInspection(
    document.id,
    document.data() as CargoInspectionDocument,
  );
}

export function subscribeToAllCargoInspections(
  onData: (inspections: CargoInspection[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  return onSnapshot(
    collection(db, CARGO_INSPECTIONS_COLLECTION),
    (snapshot) => {
      const inspections = sortByNewest(
        snapshot.docs.map((document) =>
          mapDocumentToCargoInspection(
            document.id,
            document.data() as CargoInspectionDocument,
          ),
        ),
      );
      onData(inspections);
    },
    (error) => onError(error),
  );
}

export function subscribeToUserCargoInspections(
  userId: string,
  onData: (inspections: CargoInspection[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!db) {
    onError(new Error('Firestore is not configured.'));
    return () => {};
  }

  const inspectionsQuery = query(
    collection(db, CARGO_INSPECTIONS_COLLECTION),
    where('userId', '==', userId),
  );

  return onSnapshot(
    inspectionsQuery,
    (snapshot) => {
      const inspections = sortByNewest(
        snapshot.docs.map((document) =>
          mapDocumentToCargoInspection(
            document.id,
            document.data() as CargoInspectionDocument,
          ),
        ),
      );
      onData(inspections);
    },
    (error) => onError(error),
  );
}

export type CreateCargoInspectionResult = {
  inspection: CargoInspection;
  pendingPhotoUris: string[];
  pendingVideoUris: string[];
};

function splitMediaUris(uris: readonly string[]): { remote: string[]; local: string[] } {
  const remote: string[] = [];
  const local: string[] = [];
  for (const uri of uris) {
    if (isRemoteMediaUri(uri)) {
      remote.push(uri);
    } else {
      local.push(uri);
    }
  }
  return { remote, local };
}

export async function appendInspectionPhotoUrl(
  inspectionId: string,
  downloadUrl: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  await updateDoc(doc(db, CARGO_INSPECTIONS_COLLECTION, inspectionId), {
    photoEvidence: arrayUnion(downloadUrl),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

export async function appendInspectionVideoUrl(
  inspectionId: string,
  downloadUrl: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  await updateDoc(doc(db, CARGO_INSPECTIONS_COLLECTION, inspectionId), {
    videoEvidence: arrayUnion(downloadUrl),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

/** Creates the Firestore record immediately; local media URIs upload in background. */
export async function createCargoInspectionRecord(
  userId: string,
  input: NewCargoInspectionInput,
  createdByEmail: string,
): Promise<CreateCargoInspectionResult> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const photoSplit = splitMediaUris(input.photoEvidence);
  const videoSplit = splitMediaUris(input.videoEvidence);

  const inspectionRef = doc(collection(db, CARGO_INSPECTIONS_COLLECTION));
  const registeredAtIso = new Date().toISOString();
  const payload = buildFirestorePayload(
    input,
    photoSplit.remote,
    videoSplit.remote,
    createdByEmail,
    'new',
  );

  await setDoc(inspectionRef, {
    userId,
    ...payload,
    registeredAt: serverTimestamp(),
    registeredAtIso,
  });

  const inspection: CargoInspection = {
    id: inspectionRef.id,
    unitType: input.unitType,
    uldId: payload.uldId,
    awbNumber: payload.awbNumber,
    conservationType: payload.conservationType,
    foodType: payload.foodType,
    weightKg: payload.weightKg,
    boxCount: payload.boxCount,
    status: 'new',
    hasIssues: payload.hasIssues,
    issueDescription: payload.issueDescription || undefined,
    photoEvidence: [...photoSplit.remote, ...photoSplit.local],
    videoEvidence: [...videoSplit.remote, ...videoSplit.local],
    registeredAt: registeredAtIso,
    createdBy: createdByEmail,
  };

  return {
    inspection,
    pendingPhotoUris: photoSplit.local,
    pendingVideoUris: videoSplit.local,
  };
}

export async function createCargoInspection(
  userId: string,
  input: NewCargoInspectionInput,
  createdByEmail: string,
): Promise<CargoInspection> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const inspectionRef = doc(collection(db, CARGO_INSPECTIONS_COLLECTION));
  const photoEvidence =
    input.photoEvidence.length > 0
      ? await uploadCargoInspectionPhotos(userId, inspectionRef.id, input.photoEvidence)
      : [];
  const videoEvidence =
    input.videoEvidence.length > 0
      ? await uploadCargoInspectionVideos(userId, inspectionRef.id, input.videoEvidence)
      : [];

  const registeredAtIso = new Date().toISOString();
  const payload = buildFirestorePayload(
    input,
    photoEvidence,
    videoEvidence,
    createdByEmail,
    'new',
  );

  await setDoc(inspectionRef, {
    userId,
    ...payload,
    registeredAt: serverTimestamp(),
    registeredAtIso,
  });

  return {
    id: inspectionRef.id,
    unitType: input.unitType,
    uldId: payload.uldId,
    awbNumber: payload.awbNumber,
    conservationType: payload.conservationType,
    foodType: payload.foodType,
    weightKg: payload.weightKg,
    boxCount: payload.boxCount,
    status: 'new',
    hasIssues: payload.hasIssues,
    issueDescription: payload.issueDescription || undefined,
    photoEvidence,
    videoEvidence,
    registeredAt: registeredAtIso,
    createdBy: createdByEmail,
  };
}

export async function updateCargoInspection(
  userId: string,
  inspectionId: string,
  input: UpdateCargoInspectionInput,
  createdByEmail: string,
  existingStatus: CargoInspectionStatus,
): Promise<{ photoEvidence: string[]; videoEvidence: string[]; updatedAtIso: string }> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const photoEvidence = await uploadCargoInspectionPhotos(
    userId,
    inspectionId,
    input.photoEvidence,
  );
  const videoEvidence = await uploadCargoInspectionVideos(
    userId,
    inspectionId,
    input.videoEvidence,
  );

  const updatedAtIso = new Date().toISOString();
  const payload = buildFirestorePayload(
    input,
    photoEvidence,
    videoEvidence,
    createdByEmail,
    existingStatus,
  );

  await updateDoc(doc(db, CARGO_INSPECTIONS_COLLECTION, inspectionId), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedAtIso,
  });

  return { photoEvidence, videoEvidence, updatedAtIso };
}

export async function markCargoInspectionAsLoaded(
  inspectionId: string,
): Promise<{ updatedAtIso: string; dispatchedAtIso: string }> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const dispatchedAtIso = new Date().toISOString();
  await updateDoc(doc(db, CARGO_INSPECTIONS_COLLECTION, inspectionId), {
    status: 'loaded',
    updatedAt: serverTimestamp(),
    updatedAtIso: dispatchedAtIso,
    dispatchedAt: serverTimestamp(),
    dispatchedAtIso,
  });

  return { updatedAtIso: dispatchedAtIso, dispatchedAtIso };
}

export async function deleteCargoInspection(inspectionId: string): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  await deleteDoc(doc(db, CARGO_INSPECTIONS_COLLECTION, inspectionId));
}
