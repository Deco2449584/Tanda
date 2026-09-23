import * as FileSystem from 'expo-file-system/legacy';
import {
  getDownloadURL,
  ref,
  uploadBytes,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';

import { auth, storage } from '@/services/firebaseConfig';
import { compressPhotoEvidenceUri } from '@/utils/compressPhotoEvidence';
import { isRemoteMediaUri } from '@/utils/evidenceMediaValidation';

export type UploadProgressCallback = (progressPercent: number) => void;

/** Files at or above this size are sent in disk-backed chunks instead of one blob. */
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 100 * 1024 * 1024;
const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

export type ResumableUploadState = {
  sessionUrl?: string;
  objectPath?: string;
  onSession?: (session: { sessionUrl: string; objectPath: string }) => void;
};

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

async function localFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    throw new Error('Media file is missing.');
  }
  return 'size' in info && typeof info.size === 'number' ? info.size : 0;
}

function decodeBase64(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').replace(/\s/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let offset = 0;

  for (let index = 0; index < clean.length; index += 1) {
    const value = alphabet.indexOf(clean[index] ?? '');
    if (value < 0) {
      continue;
    }
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[offset] = (buffer >> bits) & 0xff;
      offset += 1;
    }
  }

  return out.subarray(0, offset);
}

async function readFileChunk(uri: string, position: number, length: number): Promise<Blob> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
    position,
    length,
  });
  const bytes = decodeBase64(base64);
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/octet-stream' });
}

function storageBucketName(): string {
  const bucket = storage?.app.options.storageBucket;
  if (!bucket) {
    throw new Error('Firebase Storage is not configured.');
  }
  return bucket;
}

async function firebaseIdToken(): Promise<string> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in to upload media.');
  }
  return user.getIdToken();
}

type UploadResponse = {
  status: number;
  headers: Record<string, string>;
  text: string;
};

function sendUploadRequest(options: {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body?: Blob | string | null;
}): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url);
    for (const [key, value] of Object.entries(options.headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.timeout = 180_000;
    xhr.onload = () => {
      const headers: Record<string, string> = {};
      const raw = xhr.getAllResponseHeaders() || '';
      for (const line of raw.trim().split(/[\r\n]+/)) {
        const splitAt = line.indexOf(':');
        if (splitAt > 0) {
          headers[line.slice(0, splitAt).trim().toLowerCase()] = line.slice(splitAt + 1).trim();
        }
      }
      resolve({ status: xhr.status, headers, text: xhr.responseText ?? '' });
    };
    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Network timeout'));
    xhr.send(options.body ?? null);
  });
}

function downloadUrlFromFinalize(bucket: string, objectPath: string, body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { downloadTokens?: string; name?: string };
    const token = parsed.downloadTokens?.split(',')[0]?.trim();
    if (!token) {
      return null;
    }
    const name = parsed.name?.trim() || objectPath;
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(name)}?alt=media&token=${encodeURIComponent(token)}`;
  } catch {
    return null;
  }
}

async function startResumableSession(
  bucket: string,
  objectPath: string,
  contentType: string,
  totalBytes: number,
): Promise<string> {
  const token = await firebaseIdToken();
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(objectPath)}`;
  const response = await sendUploadRequest({
    url,
    method: 'POST',
    headers: {
      Authorization: `Firebase ${token}`,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(totalBytes),
      'X-Goog-Upload-Header-Content-Type': contentType,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ name: objectPath, contentType }),
  });

  const sessionUrl = response.headers['x-goog-upload-url'];
  if (response.status < 200 || response.status >= 300 || !sessionUrl) {
    throw new Error(`Could not start upload (${response.status}).`);
  }
  return sessionUrl;
}

async function querySessionOffset(sessionUrl: string): Promise<number> {
  const response = await sendUploadRequest({
    url: sessionUrl,
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'query',
    },
    body: null,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload session expired (${response.status}).`);
  }
  const received = Number(response.headers['x-goog-upload-size-received'] ?? '0');
  return Number.isFinite(received) && received > 0 ? received : 0;
}

async function uploadFileInChunks(
  localUri: string,
  objectPath: string,
  contentType: string,
  totalBytes: number,
  onProgress?: UploadProgressCallback,
  resume?: ResumableUploadState,
): Promise<string> {
  const bucket = storageBucketName();
  let sessionUrl = resume?.sessionUrl;
  let activePath = resume?.objectPath || objectPath;

  if (!sessionUrl) {
    sessionUrl = await startResumableSession(bucket, activePath, contentType, totalBytes);
    resume?.onSession?.({ sessionUrl, objectPath: activePath });
  }

  let offset = 0;
  try {
    offset = await querySessionOffset(sessionUrl);
  } catch {
    sessionUrl = await startResumableSession(bucket, activePath, contentType, totalBytes);
    resume?.onSession?.({ sessionUrl, objectPath: activePath });
    offset = 0;
  }

  while (offset < totalBytes) {
    const length = Math.min(UPLOAD_CHUNK_BYTES, totalBytes - offset);
    const chunk = await readFileChunk(localUri, offset, length);
    const isLast = offset + length >= totalBytes;
    const response = await sendUploadRequest({
      url: sessionUrl,
      method: 'POST',
      headers: {
        'X-Goog-Upload-Command': isLast ? 'upload, finalize' : 'upload',
        'X-Goog-Upload-Offset': String(offset),
        'Content-Type': 'application/octet-stream',
      },
      body: chunk,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Upload chunk failed (${response.status}).`);
    }

    offset += length;
    onProgress?.((offset / totalBytes) * 100);

    if (isLast) {
      const finalized = downloadUrlFromFinalize(bucket, activePath, response.text);
      if (finalized) {
        return finalized;
      }
      if (!storage) {
        throw new Error('Firebase Storage is not configured.');
      }
      return getDownloadURL(ref(storage, activePath));
    }
  }

  throw new Error('Upload finished without a download URL.');
}

export async function uploadSingleInspectionMediaFile(
  userId: string,
  inspectionId: string,
  folder: 'photos' | 'videos',
  localUri: string,
  onProgress?: UploadProgressCallback,
  resume?: ResumableUploadState,
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
  const contentType = contentTypeForUpload(ext, kind, '');
  const objectPath =
    resume?.objectPath ??
    `cargo_inspections/${userId}/${inspectionId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const size = await localFileSize(uploadUri);

  if (size >= CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    return uploadFileInChunks(uploadUri, objectPath, contentType, size, onProgress, {
      ...resume,
      objectPath,
    });
  }

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
