import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { resolveUnitType } from '@/lib/inspections/cargo-unit-type';
import { normalizeUldId } from '@/lib/inspections/normalize-uld-id';
import type { RegistrationGeoSnapshot } from '@/lib/inspect/capture-location';
import type { CargoInspectionCreateInput } from '@/lib/types/cargo-inspection';

export interface CreateCargoInspectionResult {
  id: string;
  registeredAtIso: string;
}

/**
 * Writes the inspection document immediately with empty evidence arrays. Media
 * URLs are appended later by the background upload queue, matching how the
 * Continental Inspect mobile app records intakes.
 */
export async function createCargoInspectionRecord(
  userId: string,
  createdByEmail: string,
  input: CargoInspectionCreateInput,
  geo: RegistrationGeoSnapshot,
): Promise<CreateCargoInspectionResult> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const uldId = normalizeUldId(input.uldId);
  const registeredAtIso = new Date().toISOString();
  const hasIssues = input.hasIssues;
  const clientLocationId = input.clientLocationId.trim();

  const payload: Record<string, unknown> = {
    userId,
    unitType: resolveUnitType(input.unitType, uldId),
    uldId,
    awbNumber: input.awbNumber.trim(),
    conservationType: input.conservationType,
    foodType: input.foodType.trim(),
    weightKg: input.weightKg,
    boxCount: input.boxCount,
    hasIssues,
    status: 'new',
    issueDescription: hasIssues ? input.issueDescription.trim() : '',
    photoEvidence: [],
    videoEvidence: [],
    createdBy: createdByEmail,
    registeredAt: serverTimestamp(),
    registeredAtIso,
    exitVehiclePlate: input.exitVehiclePlate.trim(),
    driverName: input.driverName.trim(),
    transportCompany: input.transportCompany.trim(),
    registeredLatitude: geo.registeredLatitude,
    registeredLongitude: geo.registeredLongitude,
    registeredLocationAt: geo.registeredLocationAt,
    registeredMapsUrl: geo.registeredMapsUrl,
  };

  if (hasIssues) {
    payload.issueReportedAt = registeredAtIso;
  }

  if (typeof geo.registeredAccuracyMeters === 'number') {
    payload.registeredAccuracyMeters = geo.registeredAccuracyMeters;
  }

  if (typeof input.temperatureCelsius === 'number') {
    payload.temperatureCelsius = input.temperatureCelsius;
  }

  if (clientLocationId) {
    payload.clientLocationId = clientLocationId;
    payload.clientLocationName = input.clientLocationName.trim();
    payload.portalClientId = clientLocationId;
  }

  const created = await addDoc(
    collection(db, COLLECTIONS.CARGO_INSPECTIONS),
    payload,
  );

  return { id: created.id, registeredAtIso };
}

/** Duplicate guard so the same ULD is not registered twice. */
export async function findInspectionByUldId(
  uldId: string,
): Promise<{ id: string; awbNumber: string } | null> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const normalized = normalizeUldId(uldId);
  if (!normalized) {
    return null;
  }

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.CARGO_INSPECTIONS),
      where('uldId', '==', normalized),
      limit(1),
    ),
  );

  const match = snapshot.docs[0];
  if (!match) {
    return null;
  }

  const data = match.data() as { awbNumber?: string };
  return { id: match.id, awbNumber: data.awbNumber ?? '' };
}
