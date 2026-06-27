import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { LeaveRequestStatus } from '@/lib/types/leave-request';

export async function getLeaveRequestSnapshot(requestId: string) {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.LEAVE_REQUESTS)
    .doc(requestId.trim())
    .get();

  if (!snapshot.exists) return null;
  return { id: snapshot.id, data: snapshot.data() as Record<string, unknown> };
}

export async function updateLeaveRequestStatusAdmin(
  requestId: string,
  status: Exclude<LeaveRequestStatus, 'Pending'>,
): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.LEAVE_REQUESTS)
    .doc(requestId.trim())
    .update({
      status,
      reviewedAt: FieldValue.serverTimestamp(),
    });
}
