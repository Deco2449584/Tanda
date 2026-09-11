'use client';

import { useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Upload, Video } from 'lucide-react';
import { useInspectionMediaQueue } from '@/hooks/useInspectionMediaQueue';
import {
  validateInspectionPhotoFile,
  validateInspectionVideoFile,
} from '@/lib/inspections/evidence-validation';
import {
  enqueueInspectionMedia,
  getFailedJobsForInspection,
  getInspectionUploadSummary,
  retryFailedInspectionMedia,
} from '@/lib/inspect/media-queue';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

interface InspectEvidenceReuploadProps {
  inspection: CargoInspection;
  userId: string;
}

/**
 * Lets operators retry failed background jobs or pick files again after a tab
 * close wiped the in-memory queue — the inspection doc already exists.
 */
export function InspectEvidenceReupload({
  inspection,
  userId,
}: InspectEvidenceReuploadProps) {
  const jobs = useInspectionMediaQueue();
  const summary = getInspectionUploadSummary(jobs, inspection.id);
  const failedJobs = getFailedJobsForInspection(jobs, inspection.id);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function queueFiles(photos: File[], videos: File[]) {
    if (photos.length === 0 && videos.length === 0) return;

    enqueueInspectionMedia({
      inspectionId: inspection.id,
      userId,
      label: inspection.uldId || inspection.awbNumber || inspection.id,
      photos,
      videos,
    });

    const parts: string[] = [];
    if (photos.length > 0) {
      parts.push(`${photos.length} photo${photos.length === 1 ? '' : 's'}`);
    }
    if (videos.length > 0) {
      parts.push(`${videos.length} video${videos.length === 1 ? '' : 's'}`);
    }
    setMessage(`${parts.join(' and ')} queued — uploading in the background.`);
    setError('');
  }

  async function handlePhotos(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const validationError = await validateInspectionPhotoFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      accepted.push(file);
    }
    queueFiles(accepted, []);
  }

  async function handleVideos(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const validationError = await validateInspectionVideoFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      accepted.push(file);
    }
    queueFiles([], accepted);
  }

  const hasRemoteEvidence =
    inspection.photoEvidence.length > 0 || inspection.videoEvidence.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <h3 className="text-sm font-semibold text-foreground">
        Re-upload evidence
      </h3>
      <p className="mt-1 text-xs text-subtle">
        {hasRemoteEvidence
          ? 'Add more photos or videos if something failed or was never finished. New files append to this record.'
          : 'No evidence on this record yet — pick the files again and they will upload in the background.'}
      </p>

      {summary?.status === 'pending' ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-sky-300">
            Uploading · {summary.progress}%
          </p>
          <div
            className="mt-2 h-[3px] overflow-hidden rounded-full bg-surface-hover"
            role="progressbar"
            aria-valuenow={summary.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${summary.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {failedJobs.length > 0 ? (
        <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5">
          <p className="text-xs text-danger">
            {failedJobs.length} upload
            {failedJobs.length === 1 ? '' : 's'} failed
            {failedJobs[0]?.errorMessage
              ? `: ${failedJobs[0].errorMessage}`
              : '.'}
          </p>
          <button
            type="button"
            onClick={() => {
              const count = retryFailedInspectionMedia(inspection.id);
              setMessage(
                count > 0
                  ? `Retrying ${count} failed upload${count === 1 ? '' : 's'}…`
                  : '',
              );
            }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-base px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Retry failed uploads
          </button>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Add photos
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-primary/90"
        >
          <Video className="h-4 w-4" aria-hidden />
          Add videos
        </button>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          void handlePhotos(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleVideos(event.target.files);
          event.target.value = '';
        }}
      />

      {message ? (
        <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-sky-200">
          <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {message}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {!hasRemoteEvidence && summary?.status !== 'pending' ? (
        <p className="mt-3 text-[11px] text-subtle">
          Tip: after you pick files, keep this tab open until the progress bar
          finishes. If you close it early, come back here and re-upload.
        </p>
      ) : null}
    </section>
  );
}
