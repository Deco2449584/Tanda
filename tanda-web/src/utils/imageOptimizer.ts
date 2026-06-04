import imageCompression from 'browser-image-compression';
import { MAX_SOURCE_IMAGE_BYTES } from '@/lib/images/constants';

export type ImageUploadProfile = 'avatar' | 'attendance';

const PROFILE_OPTIONS = {
  avatar: {
    maxSizeMB: 0.08,
    maxWidthOrHeight: 400,
    useWebWorker: true,
    fileType: 'image/webp',
  },
  attendance: {
    maxSizeMB: 0.12,
    maxWidthOrHeight: 720,
    useWebWorker: true,
    fileType: 'image/webp',
  },
} as const;

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const mime = blob.type || 'image/jpeg';
  const extension = mime.includes('png') ? 'png' : 'jpg';
  return new File([blob], `capture.${extension}`, { type: mime });
}

function toWebpFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'image';
  return `${base}.webp`;
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Please choose a JPEG, PNG, or WebP image.';
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    return 'Image is too large. Choose a file under 15 MB.';
  }

  return null;
}

/** Client-side WebP compression before Firebase Storage upload. */
export async function optimizeImageForUpload(
  fileOrDataUrl: File | string,
  profile: ImageUploadProfile = 'attendance',
): Promise<File> {
  const source =
    typeof fileOrDataUrl === 'string'
      ? await dataUrlToFile(fileOrDataUrl)
      : fileOrDataUrl;

  const validationError = validateImageFile(source);
  if (validationError) {
    throw new Error(validationError);
  }

  const compressed = await imageCompression(
    source,
    PROFILE_OPTIONS[profile],
  );

  return new File([compressed], toWebpFileName(source.name), {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}

export function isFirebaseStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === 'firebasestorage.googleapis.com' ||
      host.endsWith('.firebasestorage.app')
    );
  } catch {
    return false;
  }
}

export function isBlobOrDataUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}
