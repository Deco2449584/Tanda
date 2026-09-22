import type { ImagePickerAsset } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { getInfoAsync } from 'expo-file-system/legacy';

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_COMPRESSED_VIDEO_BYTES = 100 * 1024 * 1024;
/** Soft guidance: ~10 minutes at HD before the file gets hard to upload. */
export const RECOMMENDED_MAX_VIDEO_DURATION_SEC = 10 * 60;
/** Raw capture size above this is treated as heavy before compression. */
export const HEAVY_RAW_VIDEO_BYTES = 250 * 1024 * 1024;

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

export function formatFileSizeBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return 'Unknown size';
  }

  const mb = bytes / (1024 * 1024);
  if (mb < 1) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  if (mb >= 100) {
    return `${Math.round(mb)} MB`;
  }
  return `${mb.toFixed(1)} MB`;
}

export function formatDurationSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export type CapturedVideoAssessment = {
  severity: 'ok' | 'warn' | 'heavy';
  title: string;
  message: string;
};

export function assessCapturedVideo(params: {
  durationSec: number | null;
  sizeBytes: number | null;
}): CapturedVideoAssessment {
  const { durationSec, sizeBytes } = params;
  const durationLabel =
    durationSec != null ? formatDurationSeconds(durationSec) : 'Unknown duration';
  const sizeLabel = sizeBytes != null ? formatFileSizeBytes(sizeBytes) : 'Unknown size';
  const overDuration =
    durationSec != null && durationSec > RECOMMENDED_MAX_VIDEO_DURATION_SEC;
  const heavySize = sizeBytes != null && sizeBytes > HEAVY_RAW_VIDEO_BYTES;

  if (overDuration && heavySize) {
    return {
      severity: 'heavy',
      title: 'Video saved locally',
      message: `Length ${durationLabel} · ${sizeLabel}.\n\nThis clip is longer than the recommended 10 min HD and quite large. Prefer shorter clips or HD (720p) so upload is more reliable if the connection drops.`,
    };
  }

  if (overDuration) {
    return {
      severity: 'warn',
      title: 'Video saved locally',
      message: `Length ${durationLabel} · ${sizeLabel}.\n\nRecommended maximum is about 10 minutes in HD. Longer videos may fail to upload on a weak connection — the file is kept on this device until upload succeeds.`,
    };
  }

  if (heavySize) {
    return {
      severity: 'warn',
      title: 'Video saved locally',
      message: `Length ${durationLabel} · ${sizeLabel}.\n\nFile is heavy. Use HD (720p) rather than 4K when possible. It stays on this device until upload finishes.`,
    };
  }

  return {
    severity: 'ok',
    title: 'Video saved locally',
    message: `Length ${durationLabel} · ${sizeLabel}.\n\nWithin the recommended range (up to ~10 min HD). Kept on this device until upload succeeds.`,
  };
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
