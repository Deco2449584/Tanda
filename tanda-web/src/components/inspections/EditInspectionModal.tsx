'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { FirebaseImage } from '@/components/ui/FirebaseImage';
import {
  MAX_INSPECTION_PHOTOS,
  validateInspectionPhotoFile,
  validateInspectionVideoFile,
} from '@/lib/inspections/evidence-validation';
import { normalizeUldId } from '@/lib/inspections/normalize-uld-id';
import { updateCargoInspection } from '@/lib/inspections/update-inspection';
import type { InspectionMediaItem } from '@/lib/inspections/cargo-storage-upload';
import {
  CONSERVATION_TYPES,
  type CargoInspection,
  type CargoInspectionFormInput,
  type ConservationType,
} from '@/lib/types/cargo-inspection';

interface EditInspectionModalProps {
  inspection: CargoInspection | null;
  editorEmail: string;
  onClose: () => void;
  onSaved?: () => void;
}

type DraftPhoto = { kind: 'url'; url: string } | { kind: 'file'; file: File; preview: string };
type DraftVideo = { kind: 'url'; url: string } | { kind: 'file'; file: File; preview: string };

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function EditInspectionModal({
  inspection,
  editorEmail,
  onClose,
  onSaved,
}: EditInspectionModalProps) {
  const [uldId, setUldId] = useState('');
  const [awbNumber, setAwbNumber] = useState('');
  const [conservationType, setConservationType] = useState<ConservationType>('Ambient');
  const [foodType, setFoodType] = useState('');
  const [weightKg, setWeightKg] = useState('0');
  const [boxCount, setBoxCount] = useState('0');
  const [hasIssues, setHasIssues] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [videos, setVideos] = useState<DraftVideo[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inspection) return;

    setUldId(inspection.uldId);
    setAwbNumber(inspection.awbNumber);
    setConservationType(inspection.conservationType);
    setFoodType(inspection.foodType);
    setWeightKg(String(inspection.weightKg));
    setBoxCount(String(inspection.boxCount));
    setHasIssues(inspection.hasIssues);
    setIssueDescription(inspection.issueDescription ?? '');
    setPhotos(inspection.photoEvidence.map((url) => ({ kind: 'url', url })));
    setVideos(inspection.videoEvidence.map((url) => ({ kind: 'url', url })));
    setError('');
  }, [inspection]);

  const photoCount = photos.length;

  const formValid = useMemo(() => {
    return (
      uldId.trim().length > 0 &&
      awbNumber.trim().length > 0 &&
      foodType.trim().length > 0 &&
      (!hasIssues || issueDescription.trim().length > 0)
    );
  }, [awbNumber, foodType, hasIssues, issueDescription, uldId]);

  if (!inspection) return null;

  function removePhoto(index: number) {
    setPhotos((current) => {
      const removed = current[index];
      if (removed?.kind === 'file') {
        URL.revokeObjectURL(removed.preview);
      }
      return current.filter((_, i) => i !== index);
    });
  }

  function removeVideo(index: number) {
    setVideos((current) => {
      const removed = current[index];
      if (removed?.kind === 'file') {
        URL.revokeObjectURL(removed.preview);
      }
      return current.filter((_, i) => i !== index);
    });
  }

  async function handleAddPhotos(files: FileList | null) {
    if (!files) return;

    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_INSPECTION_PHOTOS) {
        setError(`Maximum ${MAX_INSPECTION_PHOTOS} photos allowed.`);
        break;
      }

      const validationError = await validateInspectionPhotoFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      next.push({
        kind: 'file',
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos(next);
  }

  async function handleAddVideos(files: FileList | null) {
    if (!files) return;

    const next = [...videos];
    for (const file of Array.from(files)) {
      const validationError = await validateInspectionVideoFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      next.push({
        kind: 'file',
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setVideos(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!inspection || !formValid || saving) return;

    if (!inspection.userId) {
      setError('Missing operator ID for this inspection. Cannot upload media.');
      return;
    }

    setSaving(true);
    setError('');

    const input: CargoInspectionFormInput = {
      uldId: normalizeUldId(uldId),
      awbNumber: awbNumber.trim(),
      conservationType,
      foodType: foodType.trim(),
      weightKg: parseNumber(weightKg),
      boxCount: Math.round(parseNumber(boxCount)),
      hasIssues,
      issueDescription: hasIssues ? issueDescription.trim() : '',
      photoEvidence: [],
      videoEvidence: [],
    };

    const photoItems: InspectionMediaItem[] = photos.map((photo) =>
      photo.kind === 'url' ? photo.url : photo.file,
    );
    const videoItems: InspectionMediaItem[] = videos.map((video) =>
      video.kind === 'url' ? video.url : video.file,
    );

    try {
      await updateCargoInspection(
        inspection.userId,
        inspection.id,
        input,
        editorEmail,
        inspection.status,
        photoItems,
        videoItems,
      );
      onSaved?.();
      onClose();
    } catch (submitError) {
      console.error('EditInspectionModal', submitError);
      setError('Could not save the inspection. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-zinc-800 bg-zinc-950 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-inspection-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 id="edit-inspection-title" className="text-lg font-bold text-white">
              Edit inspection
            </h2>
            <p className="text-xs text-zinc-500">ULD cannot be changed after registration.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="overflow-y-auto px-5 py-5"
        >
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                ULD ID
              </span>
              <input
                value={uldId}
                readOnly
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-400"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                AWB number
              </span>
              <input
                value={awbNumber}
                onChange={(event) => setAwbNumber(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Conservation
              </span>
              <select
                value={conservationType}
                onChange={(event) =>
                  setConservationType(event.target.value as ConservationType)
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
              >
                {CONSERVATION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Food type
              </span>
              <input
                value={foodType}
                onChange={(event) => setFoodType(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Weight (kg)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Box count
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={boxCount}
                  onChange={(event) => setBoxCount(event.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <input
                type="checkbox"
                checked={hasIssues}
                onChange={(event) => setHasIssues(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-600"
              />
              <span className="text-sm text-zinc-200">Report damage or issues</span>
            </label>

            {hasIssues && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Issue description
                </span>
                <textarea
                  value={issueDescription}
                  onChange={(event) => setIssueDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                />
              </label>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Photo evidence ({photoCount}/{MAX_INSPECTION_PHOTOS})
                </span>
                <label className="cursor-pointer rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                  Add photos
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => void handleAddPhotos(event.target.files)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {photos.map((photo, index) => {
                  const src = photo.kind === 'url' ? photo.url : photo.preview;
                  return (
                    <div key={`${src}-${index}`} className="relative">
                      <FirebaseImage
                        src={src}
                        alt={`Photo ${index + 1}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-lg object-cover ring-1 ring-zinc-700"
                        sizes="80px"
                        quality={70}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Video evidence ({videos.length})
                </span>
                <label className="cursor-pointer rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                  Add video
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    className="hidden"
                    onChange={(event) => void handleAddVideos(event.target.files)}
                  />
                </label>
              </div>
              <div className="space-y-2">
                {videos.map((video, index) => (
                  <div
                    key={`video-${index}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
                  >
                    <span className="truncate text-xs text-zinc-300">
                      {video.kind === 'url' ? video.url : video.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                      aria-label="Remove video"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formValid || saving}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
