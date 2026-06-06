import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';

export async function markCargoInspectionAsLoaded(
  inspectionId: string,
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const updatedAtIso = new Date().toISOString();

  await updateDoc(doc(db, COLLECTIONS.CARGO_INSPECTIONS, inspectionId), {
    status: 'loaded',
    updatedAt: serverTimestamp(),
    updatedAtIso,
  });

  return updatedAtIso;
}
