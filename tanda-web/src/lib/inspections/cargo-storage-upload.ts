import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { uploadImageToStorage } from '@/lib/images/storage-upload';
import { storage } from '@/lib/firebase';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export type InspectionMediaItem = string | File;

function isRemoteUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function videoExtension(file: File): string {
  const match = file.name.match(/\.(mp4|mov|m4v|webm)$/i);
  return match?.[1]?.toLowerCase() ?? 'mp4';
}

async function uploadVideoFile(
  userId: string,
  inspectionId: string,
  file: File,
  index: number,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const ext = videoExtension(file);
  const objectPath = `cargo_inspections/${userId}/${inspectionId}/videos/${Date.now()}-${index}.${ext}`;
  const objectRef = ref(storage, objectPath);

  await uploadBytes(objectRef, file, {
    contentType: file.type || `video/${ext === 'mov' ? 'quicktime' : ext}`,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  return getDownloadURL(objectRef);
}

export async function uploadCargoInspectionPhotos(
  userId: string,
  inspectionId: string,
  items: InspectionMediaItem[],
): Promise<string[]> {
  const urls: string[] = [];
  let uploadIndex = 0;

  for (const item of items) {
    if (typeof item === 'string') {
      if (isRemoteUrl(item)) {
        urls.push(item);
      }
      continue;
    }

    const optimized = await optimizeImageForUpload(item, 'attendance');
    const path = `cargo_inspections/${userId}/${inspectionId}/photos/${Date.now()}-${uploadIndex}.webp`;
    urls.push(await uploadImageToStorage(path, optimized));
    uploadIndex += 1;
  }

  return urls;
}

export async function uploadCargoInspectionVideos(
  userId: string,
  inspectionId: string,
  items: InspectionMediaItem[],
): Promise<string[]> {
  const urls: string[] = [];
  let uploadIndex = 0;

  for (const item of items) {
    if (typeof item === 'string') {
      if (isRemoteUrl(item)) {
        urls.push(item);
      }
      continue;
    }

    urls.push(await uploadVideoFile(userId, inspectionId, item, uploadIndex));
    uploadIndex += 1;
  }

  return urls;
}
