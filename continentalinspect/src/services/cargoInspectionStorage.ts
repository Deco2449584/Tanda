import {
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';

import { storage } from '@/services/firebaseConfig';
import { compressPhotoEvidenceUri } from '@/utils/compressPhotoEvidence';
import { isRemoteMediaUri } from '@/utils/evidenceMediaValidation';

export type UploadProgressCallback = (progressPercent: number) => void;

function extensionFromUri(uri: string, kind: 'photo' | 'video'): string {
  if (kind === 'photo') {
    if (/\.webp(\?|$)/i.test(uri)) {
      return 'webp';
    }
    const match = uri.match(/\.(jpe?g|png|heic)(\?|$)/i);
    return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'webp';
  }

  const match = uri.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
  return match?.[1]?.toLowerCase() ?? 'mp4';
}

function contentTypeForUpload(ext: string, kind: 'photo' | 'video', blobType: string): string {
  if (blobType) {
    return blobType;
  }

  if (kind === 'video') {
    return ext === 'mov' ? 'video/quicktime' : `video/${ext}`;
  }

  if (ext === 'webp') {
    return 'image/webp';
  }
  if (ext === 'png') {
    return 'image/png';
  }
  return 'image/jpeg';
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read media file (${response.status}).`);
  }
  return response.blob();
}

async function prepareLocalPhotoUri(uri: string): Promise<string> {
  if (isRemoteMediaUri(uri)) {
    return uri;
  }
  return compressPhotoEvidenceUri(uri);
}

function waitForUploadTask(
  task: UploadTask,
  onProgress?: UploadProgressCallback,
): Promise<void> {
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes <= 0) {
          return;
        }
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(percent);
      },
      (error) => reject(error),
      () => resolve(),
    );
  });
}

export async function uploadSingleInspectionMediaFile(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  localUri: string,
  onProgress?: UploadProgressCallback,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  if (isRemoteMediaUri(localUri)) {
    return localUri;
  }

  const kind = folder === 'videos' ? 'video' : 'photo';
  const uploadUri = kind === 'photo' ? await prepareLocalPhotoUri(localUri) : localUri;
  const ext = extensionFromUri(uploadUri, kind);
  const objectPath = `cargo_inspections/${userId}/${inspectionId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const objectRef = ref(storage, objectPath);
  const blob = await uriToBlob(uploadUri);

  const task = uploadBytesResumable(objectRef, blob, {
    contentType: contentTypeForUpload(ext, kind, blob.type),
  });

  await waitForUploadTask(task, onProgress);
  return getDownloadURL(objectRef);
}

async function uploadMediaUris(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  localUris: string[],
): Promise<string[]> {
  const downloadUrls: string[] = [];

  for (let index = 0; index < localUris.length; index += 1) {
    const sourceUri = localUris[index];
    const url = await uploadSingleInspectionMediaFile(
      userId,
      inspectionId,
      folder,
      sourceUri,
    );
    downloadUrls.push(url);
  }

  return downloadUrls;
}

function splitLocalAndRemote(uris: string[]): { local: string[]; remote: string[] } {
  const local: string[] = [];
  const remote: string[] = [];
  for (const uri of uris) {
    if (isRemoteMediaUri(uri)) {
      remote.push(uri);
    } else {
      local.push(uri);
    }
  }
  return { local, remote };
}

/** Synchronous batch upload — used by offline sync when connection is restored. */
export async function uploadCargoInspectionPhotos(
  userId: string,
  inspectionId: string,
  uris: string[],
): Promise<string[]> {
  const { local, remote } = splitLocalAndRemote(uris);
  const uploaded =
    local.length > 0 ? await uploadMediaUris(userId, inspectionId, 'photos', local) : [];
  return [...remote, ...uploaded];
}

/** Synchronous batch upload — used by offline sync when connection is restored. */
export async function uploadCargoInspectionVideos(
  userId: string,
  inspectionId: string,
  uris: string[],
): Promise<string[]> {
  const { local, remote } = splitLocalAndRemote(uris);
  const uploaded =
    local.length > 0 ? await uploadMediaUris(userId, inspectionId, 'videos', local) : [];
  return [...remote, ...uploaded];
}

/** Legacy single-shot upload (non-resumable) — kept for compatibility. */
export async function uploadBytesLegacy(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  localUri: string,
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const kind = folder === 'videos' ? 'video' : 'photo';
  const uploadUri = kind === 'photo' ? await prepareLocalPhotoUri(localUri) : localUri;
  const ext = extensionFromUri(uploadUri, kind);
  const objectPath = `cargo_inspections/${userId}/${inspectionId}/${folder}/${Date.now()}.${ext}`;
  const objectRef = ref(storage, objectPath);
  const blob = await uriToBlob(uploadUri);

  await uploadBytes(objectRef, blob, {
    contentType: contentTypeForUpload(ext, kind, blob.type),
  });

  return getDownloadURL(objectRef);
}
