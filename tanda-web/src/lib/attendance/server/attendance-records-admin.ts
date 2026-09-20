import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { extractStoragePathFromUrl } from '@/lib/portal/storage-path';
import type { AttendanceType } from '@/lib/types/attendance';
import {
  DEFAULT_COMPANY_SETTINGS,
} from '@/lib/types/company-settings';

export async function getAttendanceRecordSnapshot(recordId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .get();

  if (!snapshot.exists) return null;
  return { id: snapshot.id, data: snapshot.data() as Record<string, unknown> };
}

export async function getEmployeeSnapshot(employeeDocId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeDocId.trim())
    .get();

  if (!snapshot.exists) return null;
  return { id: snapshot.id, data: snapshot.data() as Record<string, unknown> };
}

export interface CreateAttendanceRecordInput {
  employeeId: string;
  employeeNameSnapshot: string;
  employeeEmailSnapshot: string;
  type: AttendanceType;
  timestampMs: number;
  source: 'web-admin-manual' | 'web-admin-manual-checkout';
  createdByEmail: string;
  createdByUid: string;
  locationId?: string;
  locationNameSnapshot?: string;
  locationCitySnapshot?: string;
  latitude?: number;
  longitude?: number;
  geoAccuracy?: number;
  geoAddress?: string;
  breakWaived?: boolean;
}

export async function createAttendanceRecordAdmin(
  input: CreateAttendanceRecordInput,
): Promise<string> {
  const timestampServer = Timestamp.fromMillis(input.timestampMs);
  const payload: Record<string, unknown> = {
    employeeId: input.employeeId,
    employeeNameSnapshot: input.employeeNameSnapshot,
    employeeEmailSnapshot: input.employeeEmailSnapshot,
    type: input.type,
    timestampServer,
    source: input.source,
    photoCaptured: false,
    photoPath: '',
    photoUrl: '',
    createdByEmail: input.createdByEmail,
    createdByUid: input.createdByUid,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (input.locationId) {
    payload.locationId = input.locationId;
    payload.locationNameSnapshot = input.locationNameSnapshot ?? null;
    if (input.locationCitySnapshot) {
      payload.locationCitySnapshot = input.locationCitySnapshot;
    }
  }

  if (input.latitude != null) payload.latitude = input.latitude;
  if (input.longitude != null) payload.longitude = input.longitude;
  if (input.geoAccuracy != null) payload.geoAccuracy = input.geoAccuracy;
  if (input.geoAddress?.trim()) payload.geoAddress = input.geoAddress.trim();
  if (input.type === 'check_out') payload.breakWaived = input.breakWaived ?? false;

  const docRef = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .add(payload);

  return docRef.id;
}

export async function syncEmployeePresence(input: {
  employeeDocId: string;
  type: AttendanceType;
  timestampMs: number;
}): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(input.employeeDocId)
    .update({
      lastAction: input.type,
      lastTimestampServer: Timestamp.fromMillis(input.timestampMs),
    });
}

export async function updateAttendanceRecordAdmin(
  recordId: string,
  update: Record<string, unknown>,
  editedBy?: { email: string; uid: string },
): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .update({
      ...update,
      ...(editedBy
        ? {
            lastEditedByEmail: editedBy.email,
            lastEditedByUid: editedBy.uid,
            lastEditedAt: FieldValue.serverTimestamp(),
          }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
}

/** Resolve Storage object path for an attendance punch photo (path or URL). */
export function resolveAttendancePhotoPath(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;

  const direct =
    typeof data.photoPath === 'string' ? data.photoPath.trim() : '';
  if (direct.startsWith('attendance/')) return direct;

  const url = typeof data.photoUrl === 'string' ? data.photoUrl.trim() : '';
  if (!url) return null;

  const fromUrl = extractStoragePathFromUrl(url);
  if (fromUrl?.startsWith('attendance/')) return fromUrl;

  return null;
}

export async function deleteAttendancePhotoFromRecordData(
  data: Record<string, unknown> | null | undefined,
): Promise<boolean> {
  const path = resolveAttendancePhotoPath(data);
  if (!path) return false;

  try {
    await getAdminStorage().bucket().file(path).delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    console.warn('deleteAttendancePhotoFromRecordData', path, error);
    return false;
  }
}

export async function deleteAttendanceRecordAdmin(recordId: string): Promise<void> {
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTIONS.ATTENDANCE_RECORDS).doc(recordId.trim());
  const snap = await ref.get();
  const data = snap.exists ? (snap.data() as Record<string, unknown>) : null;

  // Delete Storage photo before the Firestore doc so a failed delete can be retried.
  await deleteAttendancePhotoFromRecordData(data);

  await ref.delete();

  if (
    data &&
    data.type === 'check_in' &&
    typeof data.employeeId === 'string' &&
    data.employeeId.trim()
  ) {
    try {
      const settingsSnap = await db
        .collection(COLLECTIONS.SETTINGS)
        .doc('general')
        .get();
      const timeZone =
        (settingsSnap.exists &&
          typeof settingsSnap.data()?.timeZone === 'string' &&
          settingsSnap.data()?.timeZone) ||
        DEFAULT_COMPANY_SETTINGS.timeZone;

      const ts = data.timestampServer;
      const punchDate =
        ts && typeof (ts as Timestamp).toDate === 'function'
          ? (ts as Timestamp).toDate()
          : null;
      if (!punchDate) return;

      const dateKey = toInputDateInTimeZone(timeZone, punchDate);
      const { cleanupStaleLateAlertsForEmployeeDay } = await import(
        '@/lib/attendance/server/attendance-alerts-service'
      );
      await cleanupStaleLateAlertsForEmployeeDay(data.employeeId, dateKey);
    } catch (error) {
      console.warn('deleteAttendanceRecordAdmin late-alert cleanup', error);
    }
  }
}
