import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS, LEAVE_REQUEST_STATUSES, LEAVE_REQUEST_TYPES } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  LeaveRequestStatus,
  LeaveRequestType,
  UpdateLeaveRequestInput,
} from '@/lib/types/leave-request';

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

function normalizeLeaveType(value: unknown): LeaveRequestType | string {
  const trimmed = String(value ?? '').trim();
  if ((LEAVE_REQUEST_TYPES as readonly string[]).includes(trimmed)) {
    return trimmed as LeaveRequestType;
  }
  return trimmed || 'Personal';
}

function normalizeStatus(value: unknown): LeaveRequestStatus | null {
  if (
    typeof value === 'string' &&
    (LEAVE_REQUEST_STATUSES as readonly string[]).includes(value)
  ) {
    return value as LeaveRequestStatus;
  }
  return null;
}

export async function updateLeaveRequestAdmin(
  requestId: string,
  input: UpdateLeaveRequestInput,
): Promise<void> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.LEAVE_REQUESTS)
    .doc(requestId.trim());

  const update: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (input.type !== undefined) {
    update.type = normalizeLeaveType(input.type);
  }
  if (input.startDate !== undefined) {
    update.startDate = String(input.startDate).trim();
  }
  if (input.endDate !== undefined) {
    update.endDate = String(input.endDate).trim();
  }
  if (input.justification !== undefined) {
    update.justification = String(input.justification).trim();
  }

  const status = input.status ? normalizeStatus(input.status) : null;
  if (status) {
    update.status = status;
    if (status !== 'Pending') {
      update.reviewedAt = FieldValue.serverTimestamp();
    }
  }

  await ref.update(update);
}

export async function deleteLeaveRequestAdmin(requestId: string): Promise<void> {
  await getAdminFirestore()
    .collection(COLLECTIONS.LEAVE_REQUESTS)
    .doc(requestId.trim())
    .delete();
}
