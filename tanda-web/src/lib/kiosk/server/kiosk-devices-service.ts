import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  getKioskDeviceShortCode,
  hashKioskDeviceToken,
} from '@/lib/kiosk/server/device-token';
import { mapKioskDeviceDoc } from '@/lib/kiosk/server/map-kiosk-device';
import type { KioskDevice, KioskDeviceSession } from '@/lib/types/kiosk-device';

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

export async function registerKioskDevice(input: {
  token: string;
  userAgent?: string;
  platform?: string;
  reRequest?: boolean;
}): Promise<KioskDeviceSession> {
  const existing = await findKioskDeviceByToken(input.token);
  const db = getAdminFirestore();

  if (existing) {
    if (existing.status === 'revoked' && input.reRequest) {
      await existing.ref.update({
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        locationId: FieldValue.delete(),
        approvedAt: FieldValue.delete(),
        approvedBy: FieldValue.delete(),
        label: FieldValue.delete(),
      });

      const updated = await existing.ref.get();
      const device = mapKioskDeviceDoc(updated.id, updated.data() ?? {});
      return buildKioskDeviceSession(device);
    }

    await existing.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });
    return buildKioskDeviceSession(existing);
  }

  const docRef = await db.collection(COLLECTIONS.KIOSK_DEVICES).add({
    status: 'pending',
    deviceTokenHash: hashKioskDeviceToken(input.token),
    requestedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
    userAgent: input.userAgent ?? '',
    platform: input.platform ?? 'web',
  });

  const created = await docRef.get();
  const device = mapKioskDeviceDoc(created.id, created.data() ?? {});
  return buildKioskDeviceSession(device);
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
    locationId: device.locationId,
    locationName,
    locationCity,
    label: device.label,
    shortCode: getKioskDeviceShortCode(device.id),
  };
}

export async function listKioskDevices(): Promise<KioskDevice[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .orderBy('requestedAt', 'desc')
    .get();

  return snapshot.docs.map((doc) => mapKioskDeviceDoc(doc.id, doc.data()));
}

export async function approveKioskDevice(input: {
  deviceId: string;
  locationId: string;
  label?: string;
  approvedBy: string;
}): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    status: 'active',
    locationId: input.locationId.trim(),
    approvedAt: FieldValue.serverTimestamp(),
    approvedBy: input.approvedBy,
    lastSeenAt: FieldValue.serverTimestamp(),
  };

  if (input.label?.trim()) {
    updatePayload.label = input.label.trim();
  }

  await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .doc(input.deviceId)
    .update(updatePayload);
}

export async function revokeKioskDevice(deviceId: string): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.KIOSK_DEVICES).doc(deviceId).update({
    status: 'revoked',
    lastSeenAt: FieldValue.serverTimestamp(),
  });
}

export async function updateKioskDevice(input: {
  deviceId: string;
  locationId?: string;
  label?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    lastSeenAt: FieldValue.serverTimestamp(),
  };

  if (input.locationId?.trim()) {
    payload.locationId = input.locationId.trim();
  }

  if (typeof input.label === 'string') {
    payload.label = input.label.trim();
  }

  await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .doc(input.deviceId)
    .update(payload);
}

export async function countPendingKioskDevices(): Promise<number> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_DEVICES)
    .where('status', '==', 'pending')
    .get();

  return snapshot.size;
}
