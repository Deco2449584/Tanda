'use client';

import type { Announcement } from '@/lib/types/announcement';

interface DeleteAnnouncementConfirmModalProps {
  announcement: Announcement | null;
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAnnouncementConfirmModal({
  announcement,
  open,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteAnnouncementConfirmModalProps) {
  if (!open || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onCancel}
      />

      <div className="relative z-10 w-[95%] rounded-xl border border-border bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-md">
        <h2 className="text-lg font-semibold text-white">Delete announcement</h2>
        <p className="mt-2 text-sm text-muted">
          Delete{' '}
          <span className="font-medium text-foreground">
            &ldquo;{announcement.title}&rdquo;
          </span>
          ? This removes it from employee lists and deletes related in-app
          notifications. This action cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-70"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
