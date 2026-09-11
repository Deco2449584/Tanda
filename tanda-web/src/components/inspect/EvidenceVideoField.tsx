'use client';

import { useRef } from 'react';
import { Film, Upload, Video, X } from 'lucide-react';
import { validateInspectionVideoFile } from '@/lib/inspections/evidence-validation';

interface EvidenceVideoFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceVideoField({
  files,
  onChange,
  onError,
  disabled,
}: EvidenceVideoFieldProps) {
  const recordInputRef = useRef<HTMLInputElement>(null);
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
        No duration limit · optimized to 720p (≤100 MB) after you tap Save
      </p>
      <p className="mt-2 text-xs font-medium text-muted">
        {files.length} video{files.length === 1 ? '' : 's'} attached
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => recordInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Video className="h-4 w-4" aria-hidden />
          Record video
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => uploadInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-50"
        >
          <Upload className="h-4 w-4" aria-hidden />
          Upload video
        </button>
      </div>

      <input
        ref={recordInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
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
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-base px-3 py-2.5"
            >
              <Film className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">
                  Video {index + 1}
                </p>
                <p className="text-xs text-subtle">
                  {formatMegabytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove video ${index + 1}`}
                className="rounded-md p-1 text-subtle transition hover:bg-surface-hover hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
