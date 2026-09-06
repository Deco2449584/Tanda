import { Video } from 'react-native-compressor';

import {
  isCompressedVideoSizeAllowed,
  MAX_COMPRESSED_VIDEO_BYTES,
  videoDurationSeconds,
} from '@/utils/evidenceMediaValidation';

/** Max long edge in px — keeps detail readable on warehouse evidence clips. */
const VIDEO_MAX_DIMENSION = 1280;

const VIDEO_BASE_BITRATE = 850_000;
const VIDEO_MIN_BITRATE = 450_000;

export type CompressVideoProgress = (progress: number) => void;

function resolveTargetBitrate(durationSec: number | null): number {
  if (durationSec == null || durationSec <= 0) {
    return VIDEO_BASE_BITRATE;
  }

  const maxBitrateForSize = Math.floor(
    (MAX_COMPRESSED_VIDEO_BYTES * 8) / durationSec * 0.88,
  );

  return Math.max(
    VIDEO_MIN_BITRATE,
    Math.min(VIDEO_BASE_BITRATE, maxBitrateForSize),
  );
}

async function runCompressPass(
  sourceUri: string,
  bitrate: number,
  onProgress?: CompressVideoProgress,
): Promise<string> {
  const compressedUri = await Video.compress(
    sourceUri,
    {
      compressionMethod: 'manual',
      maxSize: VIDEO_MAX_DIMENSION,
      bitrate,
    },
    (progress) => {
      onProgress?.(progress);
    },
  );

  return compressedUri || sourceUri;
}

/**
 * Compresses a local video URI before upload. Retries at a lower bitrate if still too large.
 */
export async function compressVideoEvidenceUri(
  sourceUri: string,
  onProgress?: CompressVideoProgress,
  durationMs?: number | null,
): Promise<string> {
  const durationSec = videoDurationSeconds(durationMs ?? null);
  let bitrate = resolveTargetBitrate(durationSec);

  let compressedUri = await runCompressPass(sourceUri, bitrate, onProgress);

  if (await isCompressedVideoSizeAllowed(compressedUri)) {
    return compressedUri;
  }

  bitrate = Math.max(VIDEO_MIN_BITRATE, Math.floor(bitrate * 0.65));
  compressedUri = await runCompressPass(sourceUri, bitrate, onProgress);

  if (!(await isCompressedVideoSizeAllowed(compressedUri))) {
    throw new Error('VIDEO_TOO_LARGE');
  }

  return compressedUri;
}
