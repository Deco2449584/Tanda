import { deleteField, doc, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { normalizeAwbNumber } from '@/lib/portal/normalize-awb';

export async function updateInspectionPortalAccess(
  inspectionId: string,
  input: {
    portalEnabled: boolean;
    portalClientId?: string;
    awbNumber?: string;
  },
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const payload: Record<string, unknown> = {
    portalEnabled: input.portalEnabled,
  };

  if (input.portalEnabled) {
    if (!input.portalClientId?.trim()) {
      throw new Error('Select a portal client before enabling access.');
    }
    payload.portalClientId = input.portalClientId.trim();
    if (input.awbNumber?.trim()) {
      payload.awbNumber = normalizeAwbNumber(input.awbNumber);
    }
  } else {
    payload.portalClientId = deleteField();
  }

  await updateDoc(doc(db, COLLECTIONS.CARGO_INSPECTIONS, inspectionId), payload);
}
