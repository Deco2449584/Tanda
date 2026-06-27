import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { AttendanceType } from '@/lib/types/attendance';

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

export async function deleteAttendanceRecordAdmin(recordId: string): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .delete();
}
