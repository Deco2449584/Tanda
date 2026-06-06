export const MAX_INSPECTION_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SEC = 30;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

export async function validateInspectionPhotoFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) {
    return 'Please choose a JPEG, PNG, or WebP photo.';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Photo is too large. Maximum size is 3 MB.';
  }
  return null;
}

export async function validateInspectionVideoFile(file: File): Promise<string | null> {
  if (!file.type.startsWith('video/')) {
    return 'Please choose a video file.';
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'Video is too large. Maximum size is 50 MB.';
  }

  try {
    const duration = await getVideoDurationSeconds(file);
    if (duration > MAX_VIDEO_DURATION_SEC) {
      return `Video exceeds the ${MAX_VIDEO_DURATION_SEC}-second limit.`;
    }
  } catch {
    return 'Could not validate video duration.';
  }

  return null;
}
