'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Upload, X } from 'lucide-react';
import {
  formatMegabytes,
  validateInspectionVideoFile,
} from '@/lib/inspections/evidence-validation';
import { cn } from '@/lib/cn';

interface EvidenceVideoFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

interface VideoMeta {
  width: number;
  height: number;
  durationSec: number | null;
}

const HEAVY_AMBER_BYTES = 100 * 1024 * 1024;
const HEAVY_RED_BYTES = 500 * 1024 * 1024;

function heavinessPercent(bytes: number): number {
  // Visual scale capped at ~1 GB for the bar fill.
  return Math.min(100, Math.round((bytes / (1024 * 1024 * 1024)) * 100));
}

function heavinessTone(bytes: number): 'green' | 'amber' | 'red' {
  if (bytes >= HEAVY_RED_BYTES) return 'red';
  if (bytes >= HEAVY_AMBER_BYTES) return 'amber';
  return 'green';
}

function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const finish = (meta: VideoMeta) => {
      URL.revokeObjectURL(objectUrl);
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      finish({
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        durationSec: Number.isFinite(video.duration) ? video.duration : null,
      });
    };

    video.onerror = () => {
      finish({ width: 0, height: 0, durationSec: null });
    };

    video.src = objectUrl;
  });
}

function VideoAttachmentRow({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: () => void;
}) {
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const tone = heavinessTone(file.size);
  const fill = heavinessPercent(file.size);
  const longEdge = meta ? Math.max(meta.width, meta.height) : 0;
  const highRes = longEdge > 1080;

  useEffect(() => {
    let cancelled = false;
    void readVideoMeta(file).then((result) => {
      if (!cancelled) setMeta(result);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <li className="rounded-lg border border-border bg-surface-base px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Film className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">
            Video {index + 1}
            {meta && meta.width > 0
              ? ` · ${meta.width}×${meta.height}`
              : ''}
          </p>
          <p className="text-xs text-subtle">
            {formatMegabytes(file.size)} · original quality
            {meta?.durationSec != null
              ? ` · ${Math.round(meta.durationSec)}s`
              : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove video ${index + 1}`}
          className="rounded-md p-1 text-subtle transition hover:bg-surface-hover hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
          <span className="text-subtle">File size</span>
          <span
            className={cn(
              tone === 'green' && 'text-emerald-400',
              tone === 'amber' && 'text-amber-300',
              tone === 'red' && 'text-red-400',
            )}
          >
            {tone === 'green' && 'Light'}
            {tone === 'amber' && 'Heavy'}
            {tone === 'red' && 'Very heavy'}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-surface-hover"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fill}
          aria-label={`Video size ${formatMegabytes(file.size)}`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              tone === 'green' && 'bg-emerald-500',
              tone === 'amber' && 'bg-amber-400',
              tone === 'red' && 'bg-red-500',
            )}
            style={{ width: `${Math.max(4, fill)}%` }}
          />
        </div>
      </div>

      {highRes ? (
        <p className="mt-2 text-[11px] leading-relaxed text-amber-200/90">
          This clip looks higher than 1080p ({longEdge}px). Record at 1080p or
          lower to keep uploads smaller and faster.
        </p>
      ) : null}
    </li>
  );
}

export function EvidenceVideoField({
  files,
  onChange,
  onError,
  disabled,
}: EvidenceVideoFieldProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;

    const next = [...files];

    for (const file of Array.from(list)) {
      const validationError = await validateInspectionVideoFile(file);
      if (validationError) {
        onError(validationError);
        continue;
      }
      next.push(file);
    }

    onChange(next);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div>
      <span className="block text-xs font-semibold text-foreground">
        Video evidence
      </span>
      <p className="mt-1 text-xs text-subtle">
        No size or duration limit · uploaded in original quality after you save
      </p>
      <p className="mt-2 text-xs font-medium text-muted">
        {files.length} video{files.length === 1 ? '' : 's'} attached
      </p>

      <div className="mt-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => uploadInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-50"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Import from gallery
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {files.length === 0 ? (
        <p className="mt-3 text-xs italic text-subtle">No videos yet</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <VideoAttachmentRow
              key={`${file.name}-${file.lastModified}-${index}`}
              file={file}
              index={index}
              onRemove={() => removeAt(index)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
