import { MAX_VIDEO_BYTES } from '@/lib/inspections/evidence-validation';

/** Max long edge in px — keeps detail readable on warehouse evidence clips. */
const VIDEO_MAX_DIMENSION = 1280;

const VIDEO_BASE_BITRATE = 850_000;
const VIDEO_MIN_BITRATE = 450_000;
const TARGET_FPS = 30;

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export type CompressVideoProgress = (progress01: number) => void;

export interface CompressedVideoResult {
  file: File;
  /** False when the browser could not re-encode and the original is returned. */
  compressed: boolean;
}

/** `captureStream` is still vendor-prefixed or missing in some browsers. */
type CaptureVideoElement = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function pickMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  return (
    CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ??
    null
  );
}

function canReEncode(): boolean {
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    return false;
  }

  const probe = document.createElement('canvas');
  if (typeof probe.captureStream !== 'function') {
    return false;
  }

  return pickMimeType() !== null;
}

function resolveTargetBitrate(durationSec: number | null): number {
  if (durationSec == null || durationSec <= 0) {
    return VIDEO_BASE_BITRATE;
  }

  const maxBitrateForSize = Math.floor(
    ((MAX_VIDEO_BYTES * 8) / durationSec) * 0.88,
  );

  return Math.max(
    VIDEO_MIN_BITRATE,
    Math.min(VIDEO_BASE_BITRATE, maxBitrateForSize),
  );
}

function scaleToMaxDimension(width: number, height: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= VIDEO_MAX_DIMENSION) {
    return { width, height };
  }

  const ratio = VIDEO_MAX_DIMENSION / longEdge;
  // Even dimensions keep encoders happy.
  return {
    width: Math.max(2, Math.round((width * ratio) / 2) * 2),
    height: Math.max(2, Math.round((height * ratio) / 2) * 2),
  };
}

function loadVideoElement(objectUrl: string): Promise<CaptureVideoElement> {
  return new Promise((resolve, reject) => {
    const video: CaptureVideoElement = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('Could not read the video file.'));
    video.src = objectUrl;
  });
}

async function startPlayback(video: CaptureVideoElement): Promise<void> {
  // Try to keep the audio track: only fall back to muted playback when the
  // browser blocks unmuted autoplay.
  video.volume = 0;
  try {
    await video.play();
    return;
  } catch {
    video.muted = true;
    await video.play();
  }
}

function webmFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '') || 'video';
  return `${base}.webm`;
}

async function runCompressPass(
  file: File,
  bitrate: number,
  onProgress?: CompressVideoProgress,
): Promise<File> {
  const mimeType = pickMimeType();
  if (!mimeType) {
    throw new Error('VIDEO_ENCODER_UNAVAILABLE');
  }

  const objectUrl = URL.createObjectURL(file);
  let video: CaptureVideoElement | null = null;

  try {
    video = await loadVideoElement(objectUrl);

    const sourceWidth = video.videoWidth || VIDEO_MAX_DIMENSION;
    const sourceHeight = video.videoHeight || VIDEO_MAX_DIMENSION;
    const { width, height } = scaleToMaxDimension(sourceWidth, sourceHeight);
    const duration = Number.isFinite(video.duration) ? video.duration : 0;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('VIDEO_ENCODER_UNAVAILABLE');
    }

    const canvasStream = canvas.captureStream(TARGET_FPS);
    const tracks = [...canvasStream.getVideoTracks()];

    const elementStream =
      video.captureStream?.() ?? video.mozCaptureStream?.() ?? null;
    const audioTracks = elementStream?.getAudioTracks() ?? [];
    tracks.push(...audioTracks);

    const recorder = new MediaRecorder(new MediaStream(tracks), {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const recordingDone = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error('VIDEO_ENCODER_FAILED'));
    });

    let stopped = false;
    const stopRecording = () => {
      if (stopped) return;
      stopped = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      tracks.forEach((track) => track.stop());
    };

    const drawFrame = () => {
      if (stopped || !video) return;

      context.drawImage(video, 0, 0, width, height);

      if (duration > 0) {
        onProgress?.(Math.min(1, video.currentTime / duration));
      }

      if (video.ended) {
        stopRecording();
        return;
      }

      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(drawFrame);
      } else {
        requestAnimationFrame(drawFrame);
      }
    };

    video.onended = () => stopRecording();

    recorder.start(1000);
    await startPlayback(video);
    drawFrame();

    await recordingDone;
    onProgress?.(1);

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) {
      throw new Error('VIDEO_ENCODER_FAILED');
    }

    return new File([blob], webmFileName(file.name), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    if (video) {
      video.onended = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    URL.revokeObjectURL(objectUrl);
  }
}

async function readDurationSeconds(file: File): Promise<number | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = await loadVideoElement(objectUrl);
    return Number.isFinite(video.duration) ? video.duration : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Re-encodes an evidence clip to 720p-class WebM in the browser before upload.
 * Falls back to the original file when the browser has no usable encoder.
 */
export async function compressVideoEvidence(
  file: File,
  onProgress?: CompressVideoProgress,
): Promise<CompressedVideoResult> {
  if (!canReEncode()) {
    return { file, compressed: false };
  }

  const durationSec = await readDurationSeconds(file);
  const bitrate = resolveTargetBitrate(durationSec);

  try {
    let result = await runCompressPass(file, bitrate, onProgress);

    if (result.size > MAX_VIDEO_BYTES) {
      const retryBitrate = Math.max(
        VIDEO_MIN_BITRATE,
        Math.floor(bitrate * 0.65),
      );
      result = await runCompressPass(file, retryBitrate, onProgress);
    }

    if (result.size > MAX_VIDEO_BYTES) {
      throw new Error('VIDEO_TOO_LARGE');
    }

    // Keep the original when the encoder made it bigger.
    return result.size < file.size
      ? { file: result, compressed: true }
      : { file, compressed: false };
  } catch (error) {
    if (error instanceof Error && error.message === 'VIDEO_TOO_LARGE') {
      throw error;
    }
    return { file, compressed: false };
  }
}
