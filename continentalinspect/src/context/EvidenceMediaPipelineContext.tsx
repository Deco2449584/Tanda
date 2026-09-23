import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { getInfoAsync } from 'expo-file-system/legacy';
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
import {
  fetchIsOnline,
  isLikelyNetworkError,
  resolveIsOnline,
} from '@/utils/networkStatus';

export type MediaJobKind = 'photo' | 'video';

export type MediaJobStatus =
  | 'queued'
  | 'compressing'
  | 'compressed'
  | 'uploading'
  | 'uploaded'
  | 'waiting_network'
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
  retryCount: number;
  nextRetryAt?: number;
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
  retryFailedJobsForInspection: (inspectionId: string) => void;
  getJobsForInspection: (inspectionId: string) => MediaJob[];
  getInspectionMediaUploadSummary: (inspectionId: string) => InspectionMediaUploadSummary | null;
  inspectionHasPendingUploads: (inspectionId: string) => boolean;
};

const COMPRESS_WEIGHT = 0.35;
const UPLOAD_WEIGHT = 0.65;
/** Cap automatic retries so a flaky network cannot spin forever. */
const MAX_AUTO_RETRIES = 6;
const BASE_BACKOFF_MS = 8_000;
const MAX_BACKOFF_MS = 10 * 60 * 1000;
const JOBS_STORAGE_KEY = '@continentalinspect/media_upload_jobs_v1';

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

function backoffMsForRetry(retryCount: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount - 1));
  return exp;
}

function isNonRetryableMediaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message === 'PHOTO_TOO_LARGE' || error.message === 'VIDEO_TOO_LARGE';
}

function formatJobError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Media processing failed.';
  }
  if (error.message === 'PHOTO_TOO_LARGE') {
    return 'Photo exceeds 3 MB after optimization.';
  }
  if (error.message === 'VIDEO_TOO_LARGE') {
    return 'Video exceeds 100 MB after optimization.';
  }
  if (isLikelyNetworkError(error)) {
    return 'Network unavailable — will retry when online.';
  }
  return error.message || 'Media processing failed.';
}

function jobsEligibleForWork(jobs: MediaJob[], now = Date.now()): MediaJob | undefined {
  return jobs.find((job) => {
    if (job.status === 'queued' || job.status === 'compressing' || job.status === 'compressed') {
      return true;
    }
    if (job.status === 'waiting_network') {
      return !job.nextRetryAt || job.nextRetryAt <= now;
    }
    return false;
  });
}

async function sourceStillExists(uri: string): Promise<boolean> {
  try {
    const info = await getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

function serializeJobs(jobs: MediaJob[]): MediaJob[] {
  return jobs
    .filter((job) => job.status !== 'uploaded')
    .map((job) => ({
      ...job,
      // Never resume mid-flight compress/upload after process death.
      status:
        job.status === 'compressing' || job.status === 'uploading'
          ? job.localUri
            ? 'compressed'
            : 'queued'
          : job.status === 'waiting_network'
            ? 'waiting_network'
            : job.status === 'error'
              ? 'error'
              : job.status === 'compressed'
                ? 'compressed'
                : 'queued',
      progress: job.status === 'compressed' || job.localUri ? combineProgress(1, 0, 'compressed') : 0,
      errorMessage: job.status === 'error' ? job.errorMessage : undefined,
    }));
}

export function EvidenceMediaPipelineProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<MediaJob[]>([]);
  const jobsRef = useRef<MediaJob[]>([]);
  const processingRef = useRef(false);
  const hydratedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncJobs = useCallback((updater: (prev: MediaJob[]) => MediaJob[]) => {
    setJobs((prev) => {
      const next = updater(prev);
      jobsRef.current = next;
      return next;
    });
  }, []);

  const persistJobs = useCallback(async (next: MediaJob[]) => {
    try {
      const payload = serializeJobs(next);
      if (payload.length === 0) {
        await AsyncStorage.removeItem(JOBS_STORAGE_KEY);
        return;
      }
      await AsyncStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Best-effort persistence.
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }
    void persistJobs(jobs);
  }, [jobs, persistJobs]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(JOBS_STORAGE_KEY);
        if (!raw || cancelled) {
          hydratedRef.current = true;
          return;
        }

        const parsed = JSON.parse(raw) as MediaJob[];
        if (!Array.isArray(parsed) || cancelled) {
          hydratedRef.current = true;
          return;
        }

        const restored: MediaJob[] = [];
        for (const job of parsed) {
          if (!job?.id || !job.sourceUri || job.status === 'uploaded') {
            continue;
          }
          const exists = await sourceStillExists(job.sourceUri);
          if (!exists && !(job.localUri && (await sourceStillExists(job.localUri)))) {
            continue;
          }
          restored.push({
            ...job,
            retryCount: typeof job.retryCount === 'number' ? job.retryCount : 0,
            status:
              job.status === 'error'
                ? 'error'
                : job.status === 'waiting_network'
                  ? 'waiting_network'
                  : job.localUri
                    ? 'compressed'
                    : 'queued',
            progress: 0,
          });
        }

        if (!cancelled && restored.length > 0) {
          syncJobs(() => restored);
        }
      } catch {
        // Ignore corrupt cache.
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncJobs]);

  const patchJob = useCallback(
    (jobId: string, patch: Partial<MediaJob>) => {
      syncJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, ...patch } : job)),
      );
    },
    [syncJobs],
  );

  const scheduleRetryPass = useCallback((delayMs: number) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }
    retryTimerRef.current = setTimeout(() => {
      syncJobs((prev) =>
        prev.map((job) => {
          if (job.status !== 'waiting_network') {
            return job;
          }
          if (job.nextRetryAt && job.nextRetryAt > Date.now()) {
            return job;
          }
          return {
            ...job,
            status: 'queued',
            nextRetryAt: undefined,
            errorMessage: undefined,
          };
        }),
      );
    }, Math.max(0, delayMs));
  }, [syncJobs]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

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

  const markWaitingForNetwork = useCallback(
    (job: MediaJob, error: unknown) => {
      const retryCount = (job.retryCount ?? 0) + 1;
      if (retryCount > MAX_AUTO_RETRIES) {
        patchJob(job.id, {
          status: 'error',
          retryCount,
          errorMessage:
            'Upload failed after several network retries. Tap Error on the card to try again when Wi‑Fi is stable.',
        });
        return;
      }

      const delay = backoffMsForRetry(retryCount);
      patchJob(job.id, {
        status: 'waiting_network',
        retryCount,
        nextRetryAt: Date.now() + delay,
        progress: job.localUri ? combineProgress(1, 0, 'compressed') : 0,
        errorMessage: formatJobError(error),
      });
      scheduleRetryPass(delay);
    },
    [patchJob, scheduleRetryPass],
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) {
      return;
    }

    processingRef.current = true;

    try {
      while (true) {
        const online = await fetchIsOnline();
        if (!online) {
          syncJobs((prev) =>
            prev.map((job) =>
              job.status === 'queued' ||
              job.status === 'compressing' ||
              job.status === 'compressed'
                ? {
                    ...job,
                    status: 'waiting_network' as const,
                    errorMessage: 'Waiting for network…',
                  }
                : job,
            ),
          );
          break;
        }

        const next = jobsEligibleForWork(jobsRef.current);
        if (!next) {
          break;
        }

        if (next.status === 'waiting_network') {
          patchJob(next.id, {
            status: 'queued',
            nextRetryAt: undefined,
            errorMessage: undefined,
          });
        }

        const job = {
          ...next,
          status: next.status === 'waiting_network' ? ('queued' as const) : next.status,
        };

        try {
          let localUri = job.localUri;

          if (!localUri) {
            const sourceOk = await sourceStillExists(job.sourceUri);
            if (!sourceOk) {
              throw new Error(
                'Local video/photo file is missing. Re-attach the media and save again.',
              );
            }

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
            errorMessage: undefined,
            nextRetryAt: undefined,
          });
        } catch (error: unknown) {
          if (isNonRetryableMediaError(error)) {
            patchJob(job.id, {
              status: 'error',
              errorMessage: formatJobError(error),
            });
            continue;
          }

          if (isLikelyNetworkError(error) || !(await fetchIsOnline())) {
            markWaitingForNetwork(job, error);
            continue;
          }

          const retryCount = (job.retryCount ?? 0) + 1;
          if (retryCount <= MAX_AUTO_RETRIES) {
            const delay = backoffMsForRetry(retryCount);
            patchJob(job.id, {
              status: 'waiting_network',
              retryCount,
              nextRetryAt: Date.now() + delay,
              errorMessage: formatJobError(error),
            });
            scheduleRetryPass(delay);
          } else {
            patchJob(job.id, {
              status: 'error',
              retryCount,
              errorMessage: formatJobError(error),
            });
          }
        }
      }
    } finally {
      processingRef.current = false;

      const hasMore = Boolean(jobsEligibleForWork(jobsRef.current));
      if (hasMore && (await fetchIsOnline())) {
        void processQueue();
      }
    }
  }, [
    markWaitingForNetwork,
    patchJob,
    runCompress,
    runUpload,
    scheduleRetryPass,
    syncJobs,
  ]);

  useEffect(() => {
    const needsWork = Boolean(jobsEligibleForWork(jobs));
    if (needsWork) {
      void processQueue();
    }
  }, [jobs, processQueue]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = resolveIsOnline(state.isConnected, state.isInternetReachable);
      if (!online) {
        return;
      }

      let promoted = false;
      syncJobs((prev) => {
        const next = prev.map((job) => {
          if (job.status !== 'waiting_network' && job.status !== 'error') {
            return job;
          }
          if (job.status === 'error' && (job.retryCount ?? 0) >= MAX_AUTO_RETRIES) {
            // Leave hard failures for manual retry.
            return job;
          }
          if (job.status === 'error' && !isLikelyNetworkError(job.errorMessage ?? '')) {
            return job;
          }
          if (job.nextRetryAt && job.nextRetryAt > Date.now()) {
            return job;
          }
          promoted = true;
          return {
            ...job,
            status: 'queued' as const,
            nextRetryAt: undefined,
            errorMessage: undefined,
          };
        });
        return next;
      });

      if (promoted) {
        void processQueue();
      }
    });

    return unsubscribe;
  }, [processQueue, syncJobs]);

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
          retryCount: 0,
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
          retryCount: 0,
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
        retryCount: 0,
        nextRetryAt: undefined,
      });
      void processQueue();
    },
    [patchJob, processQueue],
  );

  const retryFailedJobsForInspection = useCallback(
    (inspectionId: string) => {
      let changed = false;
      syncJobs((prev) =>
        prev.map((job) => {
          if (job.inspectionId !== inspectionId) {
            return job;
          }
          if (job.status !== 'error' && job.status !== 'waiting_network') {
            return job;
          }
          changed = true;
          return {
            ...job,
            status: 'queued' as const,
            progress: job.localUri ? combineProgress(1, 0, 'compressed') : 0,
            errorMessage: undefined,
            retryCount: 0,
            nextRetryAt: undefined,
          };
        }),
      );
      if (changed) {
        void processQueue();
      }
    },
    [processQueue, syncJobs],
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
          job.status === 'uploading' ||
          job.status === 'waiting_network',
      );

      if (pendingJobs.length > 0) {
        const waiting = pendingJobs.every((job) => job.status === 'waiting_network');
        const progress = Math.round(
          pendingJobs.reduce((sum, job) => sum + job.progress, 0) / pendingJobs.length,
        );
        return {
          status: 'pending',
          progress,
          label: waiting ? 'Saved on phone · waiting for connection' : 'Uploading',
        };
      }

      if (inspectionJobs.some((job) => job.status === 'error')) {
        return {
          status: 'error',
          progress: 0,
          label: 'Upload stopped · file kept · tap to retry',
        };
      }

      return { status: 'uploaded', progress: 100, label: 'Evidence uploaded' };
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
            job.status === 'uploading' ||
            job.status === 'waiting_network'),
      ),
    [jobs],
  );

  const getJobsForInspection = useCallback(
    (inspectionId: string) => jobs.filter((job) => job.inspectionId === inspectionId),
    [jobs],
  );

  const value = useMemo(
    () => ({
      jobs,
      enqueueInspectionUploads,
      retryJob,
      retryFailedJobsForInspection,
      getJobsForInspection,
      getInspectionMediaUploadSummary,
      inspectionHasPendingUploads,
    }),
    [
      jobs,
      enqueueInspectionUploads,
      retryJob,
      retryFailedJobsForInspection,
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
