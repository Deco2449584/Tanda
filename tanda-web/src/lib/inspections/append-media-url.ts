import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';

async function appendEvidenceUrl(
  inspectionId: string,
  field: 'photoEvidence' | 'videoEvidence',
  downloadUrl: string,
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  await updateDoc(doc(db, COLLECTIONS.CARGO_INSPECTIONS, inspectionId), {
    [field]: arrayUnion(downloadUrl),
    updatedAt: serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  });
}

export function appendInspectionPhotoUrl(
  inspectionId: string,
  downloadUrl: string,
): Promise<void> {
  return appendEvidenceUrl(inspectionId, 'photoEvidence', downloadUrl);
}

export function appendInspectionVideoUrl(
  inspectionId: string,
  downloadUrl: string,
): Promise<void> {
  return appendEvidenceUrl(inspectionId, 'videoEvidence', downloadUrl);
}
