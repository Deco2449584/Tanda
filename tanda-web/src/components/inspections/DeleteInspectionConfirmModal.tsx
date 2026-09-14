'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

export const DELETE_INSPECTION_CONFIRM_PHRASE = 'DELETE';

interface DeleteInspectionConfirmModalProps {
  inspection: CargoInspection | null;
  loading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteInspectionConfirmModal({
  inspection,
  loading,
  error = null,
  onConfirm,
  onCancel,
}: DeleteInspectionConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!inspection) {
      setConfirmText('');
    }
  }, [inspection]);

  if (!mounted || !inspection) return null;

  const photoCount = inspection.photoEvidence?.length ?? 0;
  const videoCount = inspection.videoEvidence?.length ?? 0;
  const canConfirm =
    confirmText.trim().toUpperCase() === DELETE_INSPECTION_CONFIRM_PHRASE &&
    !loading;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        disabled={loading}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-inspection-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-900/50 bg-surface-raised p-5 shadow-2xl md:p-6"
      >
        <h2
          id="delete-inspection-title"
          className="text-lg font-semibold text-white"
        >
          Delete inspection?
        </h2>
        <p className="mt-2 text-sm text-muted">
          This permanently removes{' '}
          <span className="font-semibold text-foreground">
            {inspection.uldId}
          </span>{' '}
          (AWB {inspection.awbNumber}), including all photos, videos, and
          portal access for this record. This cannot be undone.
        </p>

        <ul className="mt-4 space-y-1.5 rounded-lg border border-red-500/20 bg-surface-base/60 px-3 py-3 text-xs text-muted">
          <li className="flex justify-between gap-3">
            <span>Photos</span>
            <span className="font-mono font-semibold text-foreground">
              {photoCount}
            </span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Videos</span>
            <span className="font-mono font-semibold text-foreground">
              {videoCount}
            </span>
          </li>
        </ul>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-muted">
            Type{' '}
            <span className="font-mono text-red-300">
              {DELETE_INSPECTION_CONFIRM_PHRASE}
            </span>{' '}
            to confirm
          </span>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={loading}
            autoComplete="off"
            className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-white outline-none focus:border-red-500/60 disabled:opacity-50"
            placeholder={DELETE_INSPECTION_CONFIRM_PHRASE}
          />
        </label>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-lg border border-border-strong px-3 py-2 text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            className="rounded-lg border border-red-800/60 bg-red-950/50 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/80 disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
