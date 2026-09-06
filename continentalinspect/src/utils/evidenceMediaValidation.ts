import type { ImagePickerAsset } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_COMPRESSED_VIDEO_BYTES = 100 * 1024 * 1024;

const REMOTE_URI_PATTERN = /^https?:\/\//i;

export function isRemoteMediaUri(uri: string): boolean {
  return REMOTE_URI_PATTERN.test(uri);
}

/** Expo reports video `duration` in milliseconds (see ImagePickerAsset). */
export function videoDurationSeconds(duration: number | null | undefined): number | null {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  if (duration >= 1000) {
    return duration / 1000;
  }

  return duration;
}

export async function resolveAssetFileSizeBytes(
  uri: string,
  assetFileSize?: number,
): Promise<number | null> {
  if (assetFileSize != null && assetFileSize > 0) {
    return assetFileSize;
  }

  try {
    const file = new File(uri);
    if (file.exists && file.size > 0) {
      return file.size;
    }
  } catch {
    // Fall through to legacy API (content:// URIs on Android, etc.).
  }

  try {
    const info = await getInfoAsync(uri, { size: true });
    if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
      return info.size;
    }
  } catch {
    // Size unavailable.
  }

  return null;
}

export async function isPhotoSizeAllowed(
  uri: string,
  assetFileSize?: number,
): Promise<boolean> {
  const bytes = await resolveAssetFileSizeBytes(uri, assetFileSize);
  if (bytes == null) {
    return false;
  }
  return bytes <= MAX_PHOTO_BYTES;
}

export async function isCompressedVideoSizeAllowed(uri: string): Promise<boolean> {
  const bytes = await resolveAssetFileSizeBytes(uri);
  if (bytes == null) {
    return false;
  }
  return bytes <= MAX_COMPRESSED_VIDEO_BYTES;
}

export async function validatePhotoAsset(asset: ImagePickerAsset): Promise<boolean> {
  if (!asset.uri) return false;
  return isPhotoSizeAllowed(asset.uri, asset.fileSize);
}

export const PHOTO_TOO_LARGE_MODAL = {
  title: 'Image Too Large',
  message:
    'Even after WebP optimization the photo exceeds 3 MB. Try a closer shot or lower resolution.',
  icon: 'image-outline' as const,
};

export const VIDEO_TOO_LARGE_MODAL = {
  title: 'Video Too Large',
  message:
    'The optimized video still exceeds 100 MB. Try recording at a lower resolution or a shorter clip.',
  icon: 'videocam-outline' as const,
};

export function formatMaxPhotoSizeMb(): string {
  return String(Math.round(MAX_PHOTO_BYTES / (1024 * 1024)));
}

export function formatMaxVideoSizeMb(): string {
  return String(Math.round(MAX_COMPRESSED_VIDEO_BYTES / (1024 * 1024)));
}
