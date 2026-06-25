import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  hashKioskDeviceToken,
  hashKioskLockPin,
} from '@/lib/kiosk/server/device-token';
import { mapKioskDeviceDoc } from '@/lib/kiosk/server/map-kiosk-device';
import type {
  KioskDevice,
  KioskDeviceDetails,
  KioskDeviceSession,
  KioskDeviceType,
} from '@/lib/types/kiosk-device';

export async function findKioskDeviceByToken(
  token: string,
): Promise<(KioskDevice & { ref: FirebaseFirestore.DocumentReference }) | null> {
  const tokenHash = hashKioskDeviceToken(token);
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .where('deviceTokenHash', '==', tokenHash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return {
    ...mapKioskDeviceDoc(doc.id, doc.data()),
    ref: doc.ref,
  };
}

export interface ActivateKioskDeviceInput {
  token: string;
  type: KioskDeviceType;
  name: string;
  locationId: string;
  lockPin?: string;
  details?: KioskDeviceDetails;
  createdBy: string;
}

/**
 * Creates (or refreshes) an ACTIVE kiosk device for the given token. Idempotent
 * per device token so multiple tabs / reloads do not create duplicate records.
 */
export async function activateKioskDevice(
  input: ActivateKioskDeviceInput,
): Promise<KioskDeviceSession> {
  const db = getAdminFirestore();
  const existing = await findKioskDeviceByToken(input.token);

  const base: Record<string, unknown> = {
    status: 'active',
    type: input.type,
    name: input.name.trim(),
    locationId: input.locationId.trim(),
    deviceTokenHash: hashKioskDeviceToken(input.token),
    lastSeenAt: FieldValue.serverTimestamp(),
  };

  if (input.details) {
    base.details = input.details;
  }

  const lockPinHash = input.lockPin?.trim()
    ? hashKioskLockPin(input.lockPin)
    : null;

  if (existing) {
    const updatePayload: Record<string, unknown> = {
      ...base,
      ownerEmail: input.createdBy,
    };
    if (lockPinHash) {
      updatePayload.lockPinHash = lockPinHash;
    } else if (input.type === 'mobile') {
      // Only valid on update(): clear a stale PIN if the device became mobile.
      updatePayload.lockPinHash = FieldValue.delete();
    }

    await existing.ref.update(updatePayload);
    const updated = await existing.ref.get();
    return buildKioskDeviceSession(mapKioskDeviceDoc(updated.id, updated.data() ?? {}));
  }

  const createPayload: Record<string, unknown> = {
    ...base,
    ownerEmail: input.createdBy,
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
  };
  if (lockPinHash) {
    createPayload.lockPinHash = lockPinHash;
  }

  const docRef = await db.collection(COLLECTIONS.KIOSK_DEVICES).add(createPayload);
  const created = await docRef.get();
  return buildKioskDeviceSession(mapKioskDeviceDoc(created.id, created.data() ?? {}));
}

export async function buildKioskDeviceSession(
  device: KioskDevice,
): Promise<KioskDeviceSession> {
  let locationName: string | undefined;
  let locationCity: string | undefined;

  if (device.locationId) {
    const locationDoc = await getAdminFirestore()
      .collection(COLLECTIONS.LOCATIONS)
      .doc(device.locationId)
      .get();

    if (locationDoc.exists) {
      const data = locationDoc.data();
      locationName = typeof data?.name === 'string' ? data.name : undefined;
      locationCity = typeof data?.city === 'string' ? data.city : undefined;
    }
  }

  return {
    deviceId: device.id,
    status: device.status,
    type: device.type,
    name: device.name,
    locationId: device.locationId,
    locationName,
    locationCity,
    locked: device.type === 'tablet',
  };
}

export async function verifyKioskLockPin(
  token: string,
  pin: string,
): Promise<boolean> {
  const device = await findKioskDeviceByToken(token);
  if (!device) return false;

  const snapshot = await device.ref.get();
  const lockPinHash = snapshot.data()?.lockPinHash;
  if (typeof lockPinHash !== 'string' || !lockPinHash) {
    return false;
  }

  return lockPinHash === hashKioskLockPin(pin);
}

export async function listKioskDevices(): Promise<KioskDevice[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => mapKioskDeviceDoc(doc.id, doc.data()));
}

export async function findActiveKioskDevicesByOwner(
  ownerEmail: string,
): Promise<KioskDevice[]> {
  const db = getAdminFirestore();
  const coll = db.collection(COLLECTIONS.KIOSK_DEVICES);

  const [byOwner, byCreated] = await Promise.all([
    coll.where('ownerEmail', '==', ownerEmail).where('status', '==', 'active').get(),
    coll.where('createdBy', '==', ownerEmail).where('status', '==', 'active').get(),
  ]);

  const byId = new Map<string, KioskDevice>();
  for (const doc of [...byOwner.docs, ...byCreated.docs]) {
    byId.set(doc.id, mapKioskDeviceDoc(doc.id, doc.data()));
  }

  return [...byId.values()].sort((a, b) => {
    const aTime = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
    const bTime = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
    return bTime - aTime;
  });
}

/**
 * Resumes kiosk access for a browser that has no matching active token yet.
 * Reuses settings from the user's most recent active session (new browser tab/profile).
 */
export async function resumeKioskDeviceSession(input: {
  ownerEmail: string;
  token: string;
  createdBy: string;
  details?: KioskDeviceDetails;
}): Promise<KioskDeviceSession | null> {
  const existing = await findKioskDeviceByToken(input.token);
  if (existing?.status === 'active') {
    const update: Record<string, unknown> = { lastSeenAt: FieldValue.serverTimestamp() };
    if (input.details) update.details = input.details;
    await existing.ref.update(update);
    return buildKioskDeviceSession(existing);
  }

  const templates = await findActiveKioskDevicesByOwner(input.ownerEmail);
  if (templates.length === 0) return null;

  const template = templates[0];
  const templateSnap = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .doc(template.id)
    .get();
  const templateData = templateSnap.data() ?? {};

  const createPayload: Record<string, unknown> = {
    status: 'active',
    type: template.type,
    name: template.name,
    locationId: template.locationId,
    deviceTokenHash: hashKioskDeviceToken(input.token),
    ownerEmail: input.ownerEmail,
    createdBy: input.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  };

  if (input.details) {
    createPayload.details = input.details;
  }

  if (typeof templateData.lockPinHash === 'string' && templateData.lockPinHash) {
    createPayload.lockPinHash = templateData.lockPinHash;
  }

  const docRef = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .add(createPayload);
  const created = await docRef.get();
  return buildKioskDeviceSession(mapKioskDeviceDoc(created.id, created.data() ?? {}));
}

export async function revokeKioskDevice(deviceId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.KIOSK_DEVICES).doc(deviceId).update({
    status: 'revoked',
    lastSeenAt: FieldValue.serverTimestamp(),
  });
}

export async function revokeKioskDevicesByOwner(ownerEmail: string): Promise<number> {
  const active = await findActiveKioskDevicesByOwner(ownerEmail);
  if (active.length === 0) return 0;

  const batch = getAdminFirestore().batch();
  const now = FieldValue.serverTimestamp();
  for (const device of active) {
    batch.update(getAdminFirestore().collection(COLLECTIONS.KIOSK_DEVICES).doc(device.id), {
      status: 'revoked',
      lastSeenAt: now,
    });
  }
  await batch.commit();
  return active.length;
}

export async function restoreKioskDevice(deviceId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.KIOSK_DEVICES).doc(deviceId).update({
    status: 'active',
    lastSeenAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteKioskDevice(deviceId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.KIOSK_DEVICES).doc(deviceId).delete();
}

export async function getKioskDeviceById(
  deviceId: string,
): Promise<KioskDevice | null> {
  const doc = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .doc(deviceId)
    .get();

  if (!doc.exists) return null;
  return mapKioskDeviceDoc(doc.id, doc.data() ?? {});
}

export async function updateKioskDevice(input: {
  deviceId: string;
  locationId?: string;
  name?: string;
  type?: KioskDeviceType;
  lockPin?: string;
  clearLockPin?: boolean;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    lastSeenAt: FieldValue.serverTimestamp(),
  };

  if (input.locationId?.trim()) {
    payload.locationId = input.locationId.trim();
  }

  if (typeof input.name === 'string' && input.name.trim()) {
    payload.name = input.name.trim();
  }

  if (input.type) {
    payload.type = input.type;
  }

  if (input.lockPin?.trim()) {
    payload.lockPinHash = hashKioskLockPin(input.lockPin);
  } else if (input.clearLockPin) {
    payload.lockPinHash = FieldValue.delete();
  }

  await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .doc(input.deviceId)
    .update(payload);
}
