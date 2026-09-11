import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { STORAGE_CACHE_CONTROL } from '@/lib/images/constants';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export type InspectionMediaItem = string | File;

export type UploadProgress = (progress01: number) => void;

function isRemoteUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function videoExtension(file: File): string {
  const fromName = file.name.match(/\.(mp4|mov|m4v|webm)$/i);
  if (fromName?.[1]) {
    return fromName[1].toLowerCase();
  }
  if (file.type.includes('webm')) return 'webm';
  if (file.type.includes('quicktime')) return 'mov';
  return 'mp4';
}

function videoContentType(file: File, ext: string): string {
  if (file.type) return file.type;
  return `video/${ext === 'mov' ? 'quicktime' : ext}`;
}

/** Storage layout shared with the Continental Inspect mobile app. */
export function buildInspectionMediaPath(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  ext: string,
): string {
  return `cargo_inspections/${userId}/${inspectionId}/${folder}/${Date.now()}-${randomSuffix()}.${ext}`;
}

async function uploadToStorage(
  path: string,
  data: Blob | File,
  contentType: string,
  onProgress?: UploadProgress,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const task = uploadBytesResumable(ref(storage, path), data, {
    contentType,
    cacheControl: STORAGE_CACHE_CONTROL,
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes);
        }
      },
      reject,
      () => resolve(),
    );
  });

  return getDownloadURL(task.snapshot.ref);
}

/** Uploads an already-optimized WebP evidence photo. */
export function uploadInspectionOptimizedPhoto(
  userId: string,
  inspectionId: string,
  webpFile: File,
  onProgress?: UploadProgress,
): Promise<string> {
  const path = buildInspectionMediaPath(userId, inspectionId, 'photos', 'webp');
  return uploadToStorage(path, webpFile, 'image/webp', onProgress);
}

/** Compresses and uploads one evidence photo, returning its download URL. */
export async function uploadInspectionPhotoFile(
  userId: string,
  inspectionId: string,
  file: File,
  onProgress?: UploadProgress,
): Promise<string> {
  const optimized = await optimizeImageForUpload(file, 'inspection');
  return uploadInspectionOptimizedPhoto(
    userId,
    inspectionId,
    optimized,
    onProgress,
  );
}

/** Uploads one already-compressed evidence clip, returning its download URL. */
export async function uploadInspectionVideoFile(
  userId: string,
  inspectionId: string,
  file: File,
  onProgress?: UploadProgress,
): Promise<string> {
  const ext = videoExtension(file);
  const path = buildInspectionMediaPath(userId, inspectionId, 'videos', ext);
  return uploadToStorage(path, file, videoContentType(file, ext), onProgress);
}

export async function uploadCargoInspectionPhotos(
  userId: string,
  inspectionId: string,
  items: InspectionMediaItem[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const item of items) {
    if (typeof item === 'string') {
      if (isRemoteUrl(item)) {
        urls.push(item);
      }
      continue;
    }

    urls.push(await uploadInspectionPhotoFile(userId, inspectionId, item));
  }

  return urls;
}

export async function uploadCargoInspectionVideos(
  userId: string,
  inspectionId: string,
  items: InspectionMediaItem[],
): Promise<string[]> {
  const urls: string[] = [];

  for (const item of items) {
    if (typeof item === 'string') {
      if (isRemoteUrl(item)) {
        urls.push(item);
      }
      continue;
    }

    urls.push(await uploadInspectionVideoFile(userId, inspectionId, item));
  }

  return urls;
}
