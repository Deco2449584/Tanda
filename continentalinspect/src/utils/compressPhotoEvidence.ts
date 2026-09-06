import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import {
  isPhotoSizeAllowed,
  MAX_PHOTO_BYTES,
} from '@/utils/evidenceMediaValidation';

/** Long edge cap — enough detail for warehouse evidence without huge files. */
export const PHOTO_MAX_DIMENSION = 1600;

/** WebP quality (0–1). Balanced for legibility vs. file size. */
export const PHOTO_WEBP_QUALITY = 0.72;

const REMOTE_URI_PATTERN = /^https?:\/\//i;

function isRemoteUri(uri: string): boolean {
  return REMOTE_URI_PATTERN.test(uri);
}

function isWebpUri(uri: string): boolean {
  return /\.webp(\?|$)/i.test(uri);
}

async function encodePhotoWebp(
  sourceUri: string,
  maxDimension: number,
  quality: number,
): Promise<string> {
  const result = await manipulateAsync(
    sourceUri,
    [{ resize: { width: maxDimension } }],
    {
      compress: quality,
      format: SaveFormat.WEBP,
    },
  );

  return result.uri;
}

/**
 * Resizes and encodes a local photo as WebP before upload.
 * Remote URLs (already on Storage) are returned unchanged.
 */
export async function compressPhotoEvidenceUri(sourceUri: string): Promise<string> {
  if (isRemoteUri(sourceUri)) {
    return sourceUri;
  }

  if (isWebpUri(sourceUri) && (await isPhotoSizeAllowed(sourceUri))) {
    return sourceUri;
  }

  let compressedUri = await encodePhotoWebp(
    sourceUri,
    PHOTO_MAX_DIMENSION,
    PHOTO_WEBP_QUALITY,
  );

  if (await isPhotoSizeAllowed(compressedUri)) {
    return compressedUri;
  }

  compressedUri = await encodePhotoWebp(sourceUri, 1280, 0.55);

  if (!(await isPhotoSizeAllowed(compressedUri))) {
    throw new Error('PHOTO_TOO_LARGE');
  }

  return compressedUri;
}

export function formatMaxPhotoSizeMb(): string {
  return `${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB`;
}
