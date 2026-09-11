import {
  appendInspectionPhotoUrl,
  appendInspectionVideoUrl,
} from '@/lib/inspections/append-media-url';
import {
  uploadInspectionOptimizedPhoto,
  uploadInspectionVideoFile,
} from '@/lib/inspections/cargo-storage-upload';
import { MAX_PHOTO_BYTES } from '@/lib/inspections/evidence-validation';
import { optimizeImageForUpload } from '@/utils/imageOptimizer';

export type MediaJobKind = 'photo' | 'video';

export type MediaJobStatus =
  | 'queued'
  | 'compressing'
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
  /** Optimized photo blob, reused on retry. Videos always use the original file. */
  preparedFile?: File;
  index: number;
  status: MediaJobStatus;
  /** 0-100 upload progress (photos include a brief optimize step). */
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

function patchJob(jobId: string, patch: Partial<MediaJob>) {
  jobs = jobs.map((job) => (job.id === jobId ? { ...job, ...patch } : job));
  publish();
}

function isActive(status: MediaJobStatus): boolean {
  return (
    status === 'queued' ||
    status === 'compressing' ||
    status === 'uploading'
  );
}

function needsWork(status: MediaJobStatus): boolean {
  return status === 'queued' || status === 'compressing';
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === 'PHOTO_TOO_LARGE') {
      return 'Photo still exceeds 3 MB after optimization.';
    }
    return error.message;
  }
  return 'Media processing failed.';
}

async function preparePhoto(job: MediaJob): Promise<File> {
  const optimized = await optimizeImageForUpload(job.file, 'inspection');
  if (optimized.size > MAX_PHOTO_BYTES) {
    throw new Error('PHOTO_TOO_LARGE');
  }
  return optimized;
}

async function uploadPrepared(job: MediaJob, prepared: File): Promise<string> {
  const onProgress = (ratio: number) => {
    patchJob(job.id, {
      status: 'uploading',
      progress: Math.round(ratio * 100),
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
          if (job.kind === 'photo') {
            patchJob(job.id, { status: 'compressing', progress: 0 });
            prepared = await preparePhoto(job);
            patchJob(job.id, { preparedFile: prepared, progress: 0 });
          } else {
            // Videos always upload in original quality — no re-encode.
            prepared = job.file;
            patchJob(job.id, { preparedFile: prepared });
          }
        }

        patchJob(job.id, { status: 'uploading', progress: 0 });

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
 * operator can keep working while uploads run in the background.
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
