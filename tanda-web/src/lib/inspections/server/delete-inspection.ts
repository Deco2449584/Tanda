import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase-admin';
import { extractStoragePathFromUrl } from '@/lib/portal/storage-path';
import type { DeleteCargoInspectionResult } from '@/lib/types/cargo-inspection';

export type { DeleteCargoInspectionResult };

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const bucket = getAdminStorage().bucket();
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
  const [files] = await bucket.getFiles({ prefix: normalized });
  let deleted = 0;
  for (const file of files) {
    await file.delete({ ignoreNotFound: true });
    deleted += 1;
  }
  return deleted;
}

async function deleteStoragePaths(paths: string[]): Promise<number> {
  if (paths.length === 0) return 0;
  const bucket = getAdminStorage().bucket();
  let deleted = 0;
  const unique = [...new Set(paths.filter(Boolean))];
  for (const path of unique) {
    try {
      await bucket.file(path).delete({ ignoreNotFound: true });
      deleted += 1;
    } catch {
      // Ignore individual file failures; prefix delete is primary.
    }
  }
  return deleted;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/**
 * Permanently deletes a cargo inspection document and all media under
 * `cargo_inspections/{userId}/{inspectionId}/`, plus any evidence URLs
 * that point elsewhere in Storage.
 */
export async function deleteCargoInspection(
  inspectionId: string,
): Promise<DeleteCargoInspectionResult> {
  const ref = getAdminFirestore()
    .collection(COLLECTIONS.CARGO_INSPECTIONS)
    .doc(inspectionId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error('Inspection not found.');
  }

  const data = snapshot.data() ?? {};
  const userId = typeof data.userId === 'string' ? data.userId.trim() : '';
  const uldId = typeof data.uldId === 'string' ? data.uldId : '';
  const awbNumber = typeof data.awbNumber === 'string' ? data.awbNumber : '';
  const photoEvidence = asStringArray(data.photoEvidence);
  const videoEvidence = asStringArray(data.videoEvidence);

  let storageFilesDeleted = 0;

  if (userId) {
    storageFilesDeleted += await deleteStoragePrefix(
      `cargo_inspections/${userId}/${inspectionId}`,
    );
  }

  const evidencePaths = [...photoEvidence, ...videoEvidence]
    .map((url) => extractStoragePathFromUrl(url))
    .filter((path): path is string => Boolean(path))
    .filter((path) => {
      if (!userId) return true;
      const prefix = `cargo_inspections/${userId}/${inspectionId}/`;
      return !path.startsWith(prefix);
    });

  // Catch orphaned URLs outside the expected prefix (legacy / migrated paths).
  storageFilesDeleted += await deleteStoragePaths(evidencePaths);

  await ref.delete();

  return {
    id: inspectionId,
    uldId,
    awbNumber,
    photoCount: photoEvidence.length,
    videoCount: videoEvidence.length,
    storageFilesDeleted,
  };
}
