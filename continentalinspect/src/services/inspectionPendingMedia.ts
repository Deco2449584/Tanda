import * as FileSystem from 'expo-file-system/legacy';

const PENDING_MEDIA_ROOT = `${FileSystem.documentDirectory ?? ''}pending_inspections/`;

function isRemoteUrl(uri: string): boolean {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

function isPendingMediaUri(uri: string): boolean {
  return uri.startsWith(PENDING_MEDIA_ROOT);
}

function extensionFromUri(uri: string, kind: 'photo' | 'video'): string {
  if (kind === 'photo') {
    const match = uri.match(/\.(jpe?g|png|heic|webp)(\?|$)/i);
    return match?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'webp';
  }

  const match = uri.match(/\.(mp4|mov|m4v|webm)(\?|$)/i);
  return match?.[1]?.toLowerCase() ?? 'mp4';
}

async function copyUriToDir(
  sourceUri: string,
  destinationDir: string,
  index: number,
  kind: 'photo' | 'video',
): Promise<string> {
  if (isPendingMediaUri(sourceUri)) {
    return sourceUri;
  }

  const extension = extensionFromUri(sourceUri, kind);
  const destinationUri = `${destinationDir}${index}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}

export async function persistPendingInspectionMedia(
  localId: string,
  photoUris: readonly string[],
  videoUris: readonly string[],
): Promise<{ photoEvidence: string[]; videoEvidence: string[] }> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Local storage is not available on this device.');
  }

  const baseDir = `${PENDING_MEDIA_ROOT}${localId}/`;
  const photoDir = `${baseDir}photos/`;
  const videoDir = `${baseDir}videos/`;

  await FileSystem.makeDirectoryAsync(photoDir, { intermediates: true });
  await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });

  const photoEvidence = await Promise.all(
    photoUris.map((uri, index) => copyUriToDir(uri, photoDir, index, 'photo')),
  );
  const videoEvidence = await Promise.all(
    videoUris.map((uri, index) => copyUriToDir(uri, videoDir, index, 'video')),
  );

  return { photoEvidence, videoEvidence };
}

export async function deletePendingInspectionMedia(localId: string): Promise<void> {
  if (!FileSystem.documentDirectory) {
    return;
  }

  const baseDir = `${PENDING_MEDIA_ROOT}${localId}/`;
  try {
    const info = await FileSystem.getInfoAsync(baseDir);
    if (info.exists) {
      await FileSystem.deleteAsync(baseDir, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup.
  }
}

export function filterRemoteMediaUris(uris: readonly string[]): string[] {
  return uris.filter((uri) => !isRemoteUrl(uri));
}
