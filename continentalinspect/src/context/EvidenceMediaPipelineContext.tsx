import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  appendInspectionPhotoUrl,
  appendInspectionVideoUrl,
} from '@/services/cargoInspectionRepository';
import { uploadSingleInspectionMediaFile } from '@/services/cargoInspectionStorage';
import { compressPhotoEvidenceUri } from '@/utils/compressPhotoEvidence';
import { compressVideoEvidenceUri } from '@/utils/compressVideoEvidence';
import { isPhotoSizeAllowed } from '@/utils/evidenceMediaValidation';

export type MediaJobKind = 'photo' | 'video';

export type MediaJobStatus =
  | 'queued'
  | 'compressing'
  | 'compressed'
  | 'uploading'
  | 'uploaded'
  | 'error';

export type MediaJob = {
  id: string;
  kind: MediaJobKind;
  sourceUri: string;
  localUri?: string;
  remoteUrl?: string;
  inspectionId?: string;
  userId?: string;
  awbLabel?: string;
  videoDurationMs?: number | null;
  index: number;
  status: MediaJobStatus;
  progress: number;
  errorMessage?: string;
};

type EnqueueInspectionUploadsOptions = {
  inspectionId: string;
  userId: string;
  awbLabel: string;
  photoUris: readonly string[];
  videoUris: readonly string[];
};

export type InspectionMediaUploadSummary = {
  status: 'pending' | 'uploaded' | 'error';
  progress: number;
  label: string;
};

type EvidenceMediaPipelineContextValue = {
  jobs: MediaJob[];
  enqueueInspectionUploads: (options: EnqueueInspectionUploadsOptions) => void;
  retryJob: (jobId: string) => void;
  getJobsForInspection: (inspectionId: string) => MediaJob[];
  getInspectionMediaUploadSummary: (inspectionId: string) => InspectionMediaUploadSummary | null;
  inspectionHasPendingUploads: (inspectionId: string) => boolean;
};

const COMPRESS_WEIGHT = 0.35;
const UPLOAD_WEIGHT = 0.65;

const EvidenceMediaPipelineContext = createContext<
  EvidenceMediaPipelineContextValue | undefined
>(undefined);

function createJobId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function combineProgress(compress01: number, upload01: number, status: MediaJobStatus): number {
  if (status === 'uploaded') {
    return 100;
  }
  if (status === 'uploading' || status === 'compressed') {
    return Math.round((COMPRESS_WEIGHT + upload01 * UPLOAD_WEIGHT) * 100);
  }
  if (status === 'compressing') {
    return Math.round(compress01 * COMPRESS_WEIGHT * 100);
  }
  return 0;
}

export function EvidenceMediaPipelineProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const jobsRef = useRef<MediaJob[]>([]);
  const processingRef = useRef(false);

  const syncJobs = useCallback((updater: (prev: MediaJob[]) => MediaJob[]) => {
    setJobs((prev) => {
      const next = updater(prev);
      jobsRef.current = next;
      return next;
    });
  }, []);

  const patchJob = useCallback(
    (jobId: string, patch: Partial<MediaJob>) => {
      syncJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
      );
    },
    [syncJobs],
  );

  const runCompress = useCallback(
    async (job: MediaJob): Promise<string> => {
      if (job.kind === 'photo') {
        const localUri = await compressPhotoEvidenceUri(job.sourceUri);
        const allowed = await isPhotoSizeAllowed(localUri);
        if (!allowed) {
          throw new Error('PHOTO_TOO_LARGE');
        }
        return localUri;
      }

      return compressVideoEvidenceUri(
        job.sourceUri,
        (ratio) => {
          patchJob(job.id, {
            status: 'compressing',
            progress: combineProgress(ratio, 0, 'compressing'),
          });
        },
        job.videoDurationMs ?? null,
      );
    },
    [patchJob],
  );

  const runUpload = useCallback(
    async (job: MediaJob, localUri: string): Promise<string> => {
      if (!job.inspectionId || !job.userId) {
        throw new Error('Missing inspection context for upload.');
      }

      const folder = job.kind === 'photo' ? 'photos' : 'videos';
      return uploadSingleInspectionMediaFile(
        job.userId,
        job.inspectionId,
        folder,
        localUri,
        (uploadPercent) => {
          patchJob(job.id, {
            status: 'uploading',
            progress: combineProgress(1, uploadPercent / 100, 'uploading'),
          });
        },
      );
    },
    [patchJob],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    try {
      while (true) {
        const next = jobsRef.current.find(
          (job) =>
            job.status === 'queued' ||
            job.status === 'compressing' ||
            job.status === 'compressed',
        );

        if (!next) {
          break;
        }

        const job = next;

        try {
          let localUri = job.localUri;

          if (!localUri) {
            patchJob(job.id, { status: 'compressing', progress: 0 });
            localUri = await runCompress(job);
            patchJob(job.id, {
              status: 'compressed',
              localUri,
              progress: combineProgress(1, 0, 'compressed'),
            });
          }

          if (!job.inspectionId || !job.userId) {
            throw new Error('Missing inspection context for upload.');
          }

          patchJob(job.id, {
            status: 'uploading',
            progress: combineProgress(1, 0, 'uploading'),
          });

          const remoteUrl = await runUpload({ ...job, localUri }, localUri);

          if (job.kind === 'photo') {
            await appendInspectionPhotoUrl(job.inspectionId, remoteUrl);
          } else {
            await appendInspectionVideoUrl(job.inspectionId, remoteUrl);
          }

          patchJob(job.id, {
            status: 'uploaded',
            remoteUrl,
            progress: 100,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message === 'PHOTO_TOO_LARGE'
                ? 'Photo exceeds 3 MB after optimization.'
                : error.message === 'VIDEO_TOO_LARGE'
                  ? 'Video exceeds 100 MB after optimization.'
                  : error.message
              : 'Media processing failed.';

          patchJob(job.id, {
            status: 'error',
            errorMessage: message,
          });
        }
      }
    } finally {
      processingRef.current = false;

      const hasMore = jobsRef.current.some(
        (job) =>
          job.status === 'queued' ||
          job.status === 'compressing' ||
          job.status === 'compressed',
      );
      if (hasMore) {
        void processQueue();
      }
    }
  }, [patchJob, runCompress, runUpload]);

  useEffect(() => {
    const needsWork = jobs.some(
      (job) =>
        job.status === 'queued' ||
        job.status === 'compressing' ||
        job.status === 'compressed',
    );
    if (needsWork) {
      void processQueue();
    }
  }, [jobs, processQueue]);

  const enqueueInspectionUploads = useCallback(
    (options: EnqueueInspectionUploadsOptions) => {
      const newJobs: MediaJob[] = [];

      options.photoUris.forEach((uri, index) => {
        newJobs.push({
          id: createJobId(),
          kind: 'photo',
          sourceUri: uri,
          inspectionId: options.inspectionId,
          userId: options.userId,
          awbLabel: options.awbLabel,
          index: index + 1,
          status: 'queued',
          progress: 0,
        });
      });

      options.videoUris.forEach((uri, index) => {
        newJobs.push({
          id: createJobId(),
          kind: 'video',
          sourceUri: uri,
          inspectionId: options.inspectionId,
          userId: options.userId,
          awbLabel: options.awbLabel,
          index: index + 1,
          status: 'queued',
          progress: 0,
        });
      });

      if (newJobs.length === 0) {
        return;
      }

      syncJobs((prev) => [...prev, ...newJobs]);
    },
    [syncJobs],
  );

  const retryJob = useCallback(
    (jobId: string) => {
      patchJob(jobId, {
        status: 'queued',
        progress: 0,
        errorMessage: undefined,
      });
      void processQueue();
    },
    [patchJob, processQueue],
  );

  const getInspectionMediaUploadSummary = useCallback(
    (inspectionId: string): InspectionMediaUploadSummary | null => {
      const inspectionJobs = jobs.filter((job) => job.inspectionId === inspectionId);
      if (inspectionJobs.length === 0) {
        return null;
      }

      const pendingJobs = inspectionJobs.filter(
        (job) =>
          job.status === 'queued' ||
          job.status === 'compressing' ||
          job.status === 'compressed' ||
          job.status === 'uploading',
      );

      if (pendingJobs.length > 0) {
        const progress = Math.round(
          pendingJobs.reduce((sum, job) => sum + job.progress, 0) / pendingJobs.length,
        );
        return { status: 'pending', progress, label: 'Pendiente' };
      }

      if (inspectionJobs.some((job) => job.status === 'error')) {
        return { status: 'error', progress: 0, label: 'Error' };
      }

      return { status: 'uploaded', progress: 100, label: 'Subido' };
    },
    [jobs],
  );

  const inspectionHasPendingUploads = useCallback(
    (inspectionId: string) =>
      jobs.some(
        (job) =>
          job.inspectionId === inspectionId &&
          (job.status === 'queued' ||
            job.status === 'compressing' ||
            job.status === 'compressed' ||
            job.status === 'uploading'),
      ),
    [jobs],
  );

  const getJobsForInspection = useCallback(
    (inspectionId: string) =>
      jobs.filter((job) => job.inspectionId === inspectionId),
    [jobs],
  );

  const value = useMemo(
    () => ({
      jobs,
      enqueueInspectionUploads,
      retryJob,
      getJobsForInspection,
      getInspectionMediaUploadSummary,
      inspectionHasPendingUploads,
    }),
    [
      jobs,
      enqueueInspectionUploads,
      retryJob,
      getJobsForInspection,
      getInspectionMediaUploadSummary,
      inspectionHasPendingUploads,
    ],
  );

  return (
    <EvidenceMediaPipelineContext.Provider value={value}>
      {children}
    </EvidenceMediaPipelineContext.Provider>
  );
}

export function useEvidenceMediaPipeline(): EvidenceMediaPipelineContextValue {
  const context = useContext(EvidenceMediaPipelineContext);
  if (!context) {
    throw new Error(
      'useEvidenceMediaPipeline must be used within EvidenceMediaPipelineProvider',
    );
  }
  return context;
}
