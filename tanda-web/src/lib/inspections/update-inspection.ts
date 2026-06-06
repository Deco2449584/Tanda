import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  uploadCargoInspectionPhotos,
  uploadCargoInspectionVideos,
  type InspectionMediaItem,
} from '@/lib/inspections/cargo-storage-upload';
import { normalizeUldId } from '@/lib/inspections/normalize-uld-id';
import type {
  CargoInspectionFormInput,
  CargoInspectionStatus,
} from '@/lib/types/cargo-inspection';

export async function updateCargoInspection(
  userId: string,
  inspectionId: string,
  input: CargoInspectionFormInput,
  createdByEmail: string,
  existingStatus: CargoInspectionStatus,
  photoItems: InspectionMediaItem[],
  videoItems: InspectionMediaItem[],
): Promise<{ updatedAtIso: string }> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const photoEvidence = await uploadCargoInspectionPhotos(
    userId,
    inspectionId,
    photoItems,
  );
  const videoEvidence = await uploadCargoInspectionVideos(
    userId,
    inspectionId,
    videoItems,
  );

  const updatedAtIso = new Date().toISOString();
  const issueDescription = input.hasIssues ? input.issueDescription.trim() : '';

  await updateDoc(doc(db, COLLECTIONS.CARGO_INSPECTIONS, inspectionId), {
    uldId: normalizeUldId(input.uldId),
    awbNumber: input.awbNumber.trim(),
    conservationType: input.conservationType,
    foodType: input.foodType.trim(),
    weightKg: input.weightKg,
    boxCount: input.boxCount,
    hasIssues: input.hasIssues,
    status: existingStatus,
    issueDescription,
    photoEvidence,
    videoEvidence,
    createdBy: createdByEmail,
    updatedAt: serverTimestamp(),
    updatedAtIso,
  });

  return { updatedAtIso };
}
