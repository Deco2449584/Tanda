'use client';

import { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, X } from 'lucide-react';
import {
  MAX_INSPECTION_PHOTOS,
  validateInspectionPhotoFile,
} from '@/lib/inspections/evidence-validation';

interface EvidencePhotosFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function EvidencePhotosField({
  files,
  onChange,
  onError,
  disabled,
}: EvidencePhotosFieldProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [previews],
  );

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;

    const next = [...files];

    for (const file of Array.from(list)) {
      if (next.length >= MAX_INSPECTION_PHOTOS) {
        onError(`Up to ${MAX_INSPECTION_PHOTOS} photos per inspection.`);
        break;
      }

      const validationError = await validateInspectionPhotoFile(file);
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
        Photo evidence
      </span>
      <p className="mt-1 text-xs text-subtle">
        Photos are optimized and uploaded after you tap Save (≤3 MB each)
      </p>
      <p className="mt-2 text-xs font-medium text-muted">
        {files.length} photo{files.length === 1 ? '' : 's'} attached
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Camera className="h-4 w-4" aria-hidden />
          Take photo
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-surface-hover disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Gallery
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {previews.length === 0 ? (
        <p className="mt-3 text-xs italic text-subtle">No photos yet</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((preview, index) => (
            <li
              key={preview.url}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-base"
            >
              <Image
                src={preview.url}
                alt={`Evidence photo ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white transition hover:bg-black"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
