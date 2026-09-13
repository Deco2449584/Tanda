'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CascadeImpactItem, LocationCascadePreview } from '@/lib/types/cascade-delete';
import type { Location } from '@/lib/types/location';
import { fetchLocationCascadePreview } from '@/lib/admin/cascade-delete-api';

export const DELETE_LOCATION_CONFIRM_PHRASE = 'DELETE';

interface DeleteLocationConfirmModalProps {
  location: Location | null;
  loading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function ImpactList({ items }: { items: CascadeImpactItem[] }) {
  return (
    <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-red-500/20 bg-surface-base/60 p-3 text-xs">
      {items.map((item) => (
        <li key={item.key} className="flex items-start justify-between gap-3">
          <span className="text-muted">
            {item.label}
            {item.action === 'clear' ? (
              <span className="ml-1 text-amber-300/90">(cleared)</span>
            ) : null}
          </span>
          <span className="shrink-0 font-mono font-semibold text-foreground">
            {item.count}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DeleteLocationConfirmModal({
  location,
  loading,
  error = null,
  onConfirm,
  onCancel,
}: DeleteLocationConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [mounted, setMounted] = useState(false);
  const [preview, setPreview] = useState<LocationCascadePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!location) {
      setConfirmText('');
      setPreview(null);
      setPreviewError(null);
      return;
    }

    setConfirmText('');
    setPreview(null);
    setPreviewError(null);
    setPreviewLoading(true);

    let cancelled = false;
    void fetchLocationCascadePreview(location.id)
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(
            err instanceof Error ? err.message : 'Could not load associated data.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [location]);

  useEffect(() => {
    if (!location) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [location, loading, onCancel]);

  if (!location || !mounted) return null;

  const canConfirm =
    confirmText.trim() === DELETE_LOCATION_CONFIRM_PHRASE &&
    !loading &&
    !previewLoading &&
    !previewError;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 pt-16 sm:items-center sm:pt-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-location-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-red-500/30 bg-surface-raised p-6 shadow-2xl">
        <h2
          id="delete-location-title"
          className="font-sans text-lg font-semibold text-foreground"
        >
          Permanently delete client
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You are about to permanently delete{' '}
          <span className="font-medium text-foreground">{location.name}</span>. Prefer
          deactivating when you only need to hide it. Deleting removes site shifts and
          attendance for this client. Staff profiles are kept but unassigned.
        </p>

        {previewLoading ? (
          <p className="mt-3 text-xs text-subtle">Loading associated data…</p>
        ) : previewError ? (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {previewError}
          </p>
        ) : preview ? (
          <ImpactList items={preview.items} />
        ) : null}

        <div className="mt-4 rounded-xl border border-border bg-surface-base/50 p-4">
          <label htmlFor="delete-location-confirm" className="block text-xs text-subtle">
            Type{' '}
            <span className="font-mono font-semibold text-red-300">
              {DELETE_LOCATION_CONFIRM_PHRASE}
            </span>{' '}
            to confirm.
          </label>
          <input
            id="delete-location-confirm"
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={loading}
            placeholder={DELETE_LOCATION_CONFIRM_PHRASE}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted transition hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete everything'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
