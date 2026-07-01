'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Announcement } from '@/lib/types/announcement';

interface EditAnnouncementModalProps {
  announcement: Announcement | null;
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: (input: { title: string; body: string }) => Promise<void>;
}

export function EditAnnouncementModal({
  announcement,
  open,
  saving = false,
  onClose,
  onSave,
}: EditAnnouncementModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !announcement) return;
    setTitle(announcement.title);
    setBody(announcement.body);
    setError('');
  }, [announcement, open]);

  if (!open || !announcement) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!title.trim() || !body.trim()) {
      setError('Subject and message are required.');
      return;
    }

    try {
      await onSave({
        title: title.trim(),
        body: body.trim(),
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save changes.',
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close edit announcement"
        className="absolute inset-0 bg-black/60"
        onClick={() => !saving && onClose()}
      />

      <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface-raised p-5 shadow-2xl md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit announcement</h2>
            <p className="mt-1 text-xs text-subtle">
              Updates the stored message and in-app notifications. Emails already sent
              are not changed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label htmlFor="edit-announcement-title" className="mb-1.5 block text-sm text-muted">
              Subject
            </label>
            <input
              id="edit-announcement-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="edit-announcement-body" className="mb-1.5 block text-sm text-muted">
              Message
            </label>
            <textarea
              id="edit-announcement-body"
              rows={8}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={4000}
              disabled={saving}
              className="w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-60"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 text-sm text-muted transition hover:bg-surface-hover disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
