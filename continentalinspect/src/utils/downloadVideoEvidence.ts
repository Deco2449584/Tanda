import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

export type DownloadVideoEvidenceResult =
  | { ok: true }
  | { ok: false; reason: 'permission_denied' | 'download_failed'; message: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

/**
 * Ensures gallery write access (`status === 'granted'`) before saving media.
 */
export async function ensureMediaLibrarySavePermission(): Promise<boolean> {
  let permissions = await MediaLibrary.getPermissionsAsync();
  if (permissions.status === 'granted') {
    return true;
  }

  permissions = await MediaLibrary.requestPermissionsAsync();
  return permissions.status === 'granted';
}

/**
 * Downloads a Firebase Storage video URL to a local `.mp4` file, then saves it to the gallery.
 */
export async function downloadVideoEvidenceToGallery(
  remoteUrl: string,
  index: number,
): Promise<DownloadVideoEvidenceResult> {
  try {
    const permissions = await MediaLibrary.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      const requested = await MediaLibrary.requestPermissionsAsync();
      if (requested.status !== 'granted') {
        const message =
          requested.status === 'denied'
            ? 'Permission denied. Enable Photos/Media access in system settings to save videos.'
            : `Media library permission not granted (status: ${requested.status}).`;
        return { ok: false, reason: 'permission_denied', message };
      }
    }

    const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    if (!baseDir) {
      throw new Error('No writable app directory available for temporary download.');
    }

    const fileUri = `${baseDir}cargo_evidence_${Date.now()}_${index}.mp4`;

    const download = await FileSystem.downloadAsync(remoteUrl, fileUri);

    if (!download.uri) {
      throw new Error('Download completed but no local file URI was returned.');
    }

    if (download.status !== 200) {
      throw new Error(`Download failed with HTTP status ${download.status}.`);
    }

    await MediaLibrary.saveToLibraryAsync(download.uri);

    try {
      await FileSystem.deleteAsync(download.uri, { idempotent: true });
    } catch (cleanupError) {
      console.warn('Could not remove temporary video file:', cleanupError);
    }

    return { ok: true };
  } catch (error) {
    console.error('Download error:', error);
    return {
      ok: false,
      reason: 'download_failed',
      message: errorMessage(error),
    };
  }
}
