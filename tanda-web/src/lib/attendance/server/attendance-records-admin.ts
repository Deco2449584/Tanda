import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function getAttendanceRecordSnapshot(recordId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .get();

  if (!snapshot.exists) return null;
  return { id: snapshot.id, data: snapshot.data() as Record<string, unknown> };
}

export async function updateAttendanceRecordAdmin(
  recordId: string,
  update: Record<string, unknown>,
): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .update({
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteAttendanceRecordAdmin(recordId: string): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .doc(recordId.trim())
    .delete();
}
