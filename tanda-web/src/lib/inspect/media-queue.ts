import {
  appendInspectionPhotoUrl,
  appendInspectionVideoUrl,
} from '@/lib/inspections/append-media-url';
import {
  uploadInspectionOptimizedPhoto,
  uploadInspectionVideoFile,
} from '@/lib/inspections/cargo-storage-upload';
import {
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
  videoNeedsCompression,
} from '@/lib/inspections/evidence-validation';
import { compressVideoEvidence } from '@/lib/inspect/compress-video';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export type MediaJobKind = 'photo' | 'video';

export type MediaJobStatus =
  | 'queued'
  | 'compressing'
  | 'compressed'
  | 'uploading'
  | 'uploaded'
  | 'error';

export interface MediaJob {
  id: string;
  kind: MediaJobKind;
  inspectionId: string;
  userId: string;
  label: string;
  file: File;
  /**
   * False for clips already within the storage budget: they skip re-encoding
   * and upload in their original quality.
   */
  needsCompression: boolean;
  /** Result of the compression phase, reused when a job is retried. */
  preparedFile?: File;
  index: number;
  status: MediaJobStatus;
  /** 0-100, weighted across compression and upload. */
  progress: number;
  errorMessage?: string;
}

export interface InspectionUploadSummary {
  status: 'pending' | 'uploaded' | 'error';
  progress: number;
  label: string;
}

export interface EnqueueInspectionMediaOptions {
  inspectionId: string;
  userId: string;
  label: string;
  photos: readonly File[];
  videos: readonly File[];
}

const COMPRESS_WEIGHT = 0.35;
const UPLOAD_WEIGHT = 0.65;

type Listener = (jobs: MediaJob[]) => void;

let jobs: MediaJob[] = [];
let processing = false;
const listeners = new Set<Listener>();

function publish() {
  listeners.forEach((listener) => listener(jobs));
}

function createJobId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Upload owns the whole bar when there is no compression phase. */
function progressWeights(needsCompression: boolean) {
  return needsCompression
    ? { compress: COMPRESS_WEIGHT, upload: UPLOAD_WEIGHT }
    : { compress: 0, upload: 1 };
}

function combineProgress(
  job: Pick<MediaJob, 'needsCompression'>,
  compress01: number,
  upload01: number,
  status: MediaJobStatus,
): number {
  const weights = progressWeights(job.needsCompression);

  if (status === 'uploaded') return 100;
  if (status === 'uploading' || status === 'compressed') {
    return Math.round((weights.compress + upload01 * weights.upload) * 100);
  }
  if (status === 'compressing') {
    return Math.round(compress01 * weights.compress * 100);
  }
  return 0;
}

function patchJob(jobId: string, patch: Partial<MediaJob>) {
  jobs = jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job));
  publish();
}

function isActive(status: MediaJobStatus): boolean {
  return (
    status === 'queued' ||
    status === 'compressing' ||
    status === 'compressed' ||
    status === 'uploading'
  );
}

function needsWork(status: MediaJobStatus): boolean {
  return (
    status === 'queued' || status === 'compressing' || status === 'compressed'
  );
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'PHOTO_TOO_LARGE') {
      return 'Photo still exceeds 3 MB after optimization.';
    }
    if (error.message === 'VIDEO_TOO_LARGE') {
      return 'Video still exceeds 300 MB after optimization. Record a shorter clip.';
    }
    return error.message;
  }
  return 'Media processing failed.';
}

async function prepareFile(job: MediaJob): Promise<File> {
  if (job.kind === 'photo') {
    const optimized = await optimizeImageForUpload(job.file, 'inspection');
    if (optimized.size > MAX_PHOTO_BYTES) {
      throw new Error('PHOTO_TOO_LARGE');
    }
    return optimized;
  }

  if (!job.needsCompression) {
    return job.file;
  }

  const { file } = await compressVideoEvidence(job.file, (ratio) => {
    patchJob(job.id, {
      status: 'compressing',
      progress: combineProgress(job, ratio, 0, 'compressing'),
    });
  });

  // Guards the fallback path where the browser had no usable encoder.
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error('VIDEO_TOO_LARGE');
  }

  return file;
}

async function uploadPrepared(job: MediaJob, prepared: File): Promise<string> {
  const onProgress = (ratio: number) => {
    patchJob(job.id, {
      status: 'uploading',
      progress: combineProgress(job, 1, ratio, 'uploading'),
    });
  };

  if (job.kind === 'photo') {
    return uploadInspectionOptimizedPhoto(
      job.userId,
      job.inspectionId,
      prepared,
      onProgress,
    );
  }

  return uploadInspectionVideoFile(
    job.userId,
    job.inspectionId,
    prepared,
    onProgress,
  );
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  try {
    for (;;) {
      const job = jobs.find((item) => needsWork(item.status));
      if (!job) break;

      try {
        let prepared = job.preparedFile;

        if (!prepared) {
          patchJob(job.id, { status: 'compressing', progress: 0 });
          prepared = await prepareFile(job);
          patchJob(job.id, {
            status: 'compressed',
            preparedFile: prepared,
            progress: combineProgress(job, 1, 0, 'compressed'),
          });
        }

        patchJob(job.id, {
          status: 'uploading',
          progress: combineProgress(job, 1, 0, 'uploading'),
        });

        const downloadUrl = await uploadPrepared(job, prepared);

        if (job.kind === 'photo') {
          await appendInspectionPhotoUrl(job.inspectionId, downloadUrl);
        } else {
          await appendInspectionVideoUrl(job.inspectionId, downloadUrl);
        }

        patchJob(job.id, { status: 'uploaded', progress: 100 });
      } catch (error) {
        console.error('inspection media upload', error);
        patchJob(job.id, {
          status: 'error',
          errorMessage: describeError(error),
        });
      }
    }
  } finally {
    processing = false;
    if (jobs.some((job) => needsWork(job.status))) {
      void processQueue();
    }
  }
}

export function subscribeInspectionMedia(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInspectionMediaJobs(): MediaJob[] {
  return jobs;
}

/**
 * Queues evidence for an already-saved inspection. Returns immediately so the
 * operator can keep working while compression and upload run in the background.
 */
export function enqueueInspectionMedia(
  options: EnqueueInspectionMediaOptions,
): void {
  const queued: MediaJob[] = [];

  options.photos.forEach((file, index) => {
    queued.push({
      id: createJobId(),
      kind: 'photo',
      inspectionId: options.inspectionId,
      userId: options.userId,
      label: options.label,
      file,
      needsCompression: true,
      index: index + 1,
      status: 'queued',
      progress: 0,
    });
  });

  options.videos.forEach((file, index) => {
    queued.push({
      id: createJobId(),
      kind: 'video',
      inspectionId: options.inspectionId,
      userId: options.userId,
      label: options.label,
      file,
      needsCompression: videoNeedsCompression(file),
      index: index + 1,
      status: 'queued',
      progress: 0,
    });
  });

  if (queued.length === 0) return;

  jobs = [...jobs, ...queued];
  publish();
  void processQueue();
}

export function retryInspectionMediaJob(jobId: string): void {
  patchJob(jobId, { status: 'queued', progress: 0, errorMessage: undefined });
  void processQueue();
}

export function clearFinishedInspectionMedia(inspectionId: string): void {
  jobs = jobs.filter(
    (job) => job.inspectionId !== inspectionId || job.status !== 'uploaded',
  );
  publish();
}

export function getInspectionUploadSummary(
  allJobs: readonly MediaJob[],
  inspectionId: string,
): InspectionUploadSummary | null {
  const forInspection = allJobs.filter(
    (job) => job.inspectionId === inspectionId,
  );
  if (forInspection.length === 0) {
    return null;
  }

  const active = forInspection.filter((job) => isActive(job.status));

  if (active.length > 0) {
    const progress = Math.round(
      active.reduce((sum, job) => sum + job.progress, 0) / active.length,
    );
    return { status: 'pending', progress, label: 'Uploading' };
  }

  if (forInspection.some((job) => job.status === 'error')) {
    return { status: 'error', progress: 0, label: 'Upload failed' };
  }

  return { status: 'uploaded', progress: 100, label: 'Uploaded' };
}

export function hasPendingInspectionUploads(
  allJobs: readonly MediaJob[],
): boolean {
  return allJobs.some((job) => isActive(job.status));
}
