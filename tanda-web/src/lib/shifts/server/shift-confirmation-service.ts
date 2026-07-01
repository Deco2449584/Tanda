import { FieldValue } from 'firebase-admin/firestore';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { Shift, ShiftConfirmationStatus } from '@/lib/types/shift';

export async function getShiftById(shiftId: string): Promise<Shift | null> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SHIFTS)
    .doc(shiftId.trim())
    .get();

  if (!snapshot.exists) return null;
  return mapShiftDoc(snapshot.id, snapshot.data() ?? {});
}

export async function respondToShiftConfirmation(input: {
  shiftId: string;
  employeeId: string;
  response: Exclude<ShiftConfirmationStatus, 'pending'>;
  note?: string;
}): Promise<Shift> {
  const ref = getAdminFirestore().collection(COLLECTIONS.SHIFTS).doc(input.shiftId.trim());
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error('Shift not found.');
  }

  const shift = mapShiftDoc(snapshot.id, snapshot.data() ?? {});

  if (shift.employeeId !== input.employeeId) {
    throw new Error('You can only confirm your own shifts.');
  }

  if (shift.status !== 'scheduled') {
    throw new Error('Only scheduled shifts can be confirmed.');
  }

  if (shift.confirmationStatus !== 'pending') {
    throw new Error('This shift has already been answered.');
  }

  const trimmedNote = input.note?.trim() ?? '';

  if (input.response === 'declined' && !trimmedNote) {
    throw new Error('Add a short note explaining why you cannot attend.');
  }

  const update: Record<string, unknown> = {
    confirmationStatus: input.response,
    confirmedAt: FieldValue.serverTimestamp(),
  };

  if (input.response === 'declined') {
    update.confirmationNote = trimmedNote;
  } else {
    update.confirmationNote = FieldValue.delete();
  }

  await ref.update(update);

  const saved = await ref.get();
  return mapShiftDoc(saved.id, saved.data() ?? {});
}
