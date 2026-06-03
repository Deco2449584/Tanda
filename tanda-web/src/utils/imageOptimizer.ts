import imageCompression from 'browser-image-compression';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  fileType: 'image/webp',
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

/** Aggressive client-side compression before Firebase Storage upload. */
export async function optimizeImageForUpload(
  fileOrDataUrl: File | string,
): Promise<File> {
  const source =
    typeof fileOrDataUrl === 'string'
      ? await dataUrlToFile(fileOrDataUrl)
      : fileOrDataUrl;

  const compressed = await imageCompression(source, COMPRESSION_OPTIONS);

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
