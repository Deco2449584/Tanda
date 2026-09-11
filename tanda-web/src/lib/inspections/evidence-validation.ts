/** Sanity cap on evidence photos per inspection. */
export const MAX_INSPECTION_PHOTOS = 12;

/** Source photo cap before client-side WebP compression. */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

/**
 * Storage budget per clip. Anything at or below this is uploaded untouched so
 * the original camera MP4/MOV reaches Firebase — it plays everywhere, including
 * the iOS mobile app, which cannot decode the WebM our re-encoder produces.
 */
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

/** Above the budget we re-encode; above this we refuse to even try. */
export const MAX_SOURCE_VIDEO_BYTES = 1536 * 1024 * 1024;

export function videoNeedsCompression(file: File): boolean {
  return file.size > MAX_VIDEO_BYTES;
}

export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read video metadata.'));
    };

    video.src = objectUrl;
  });
}

export async function validateInspectionPhotoFile(
  file: File,
): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    return 'Please choose a JPEG, PNG, or WebP photo.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Photo is too large. Maximum size is 3 MB.';
  }
  return null;
}

export async function validateInspectionVideoFile(
  file: File,
): Promise<string | null> {
  if (!file.type.startsWith('video/')) {
    return 'Please choose a video file.';
  }
  if (file.size > MAX_SOURCE_VIDEO_BYTES) {
    return 'Video is too large to process. Record a shorter clip.';
  }

  return null;
}

export function formatMegabytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
