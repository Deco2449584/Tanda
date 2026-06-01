'use client';

interface DeleteConfirmModalProps {
  employeeName: string | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  employeeName,
  loading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!employeeName) return null;

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

      <div className="relative z-10 w-[95%] rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl md:w-full md:max-w-md">
        <h2 className="text-lg font-semibold text-white">Delete record</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Delete the record for{' '}
          <span className="font-medium text-zinc-200">{employeeName}</span>?
          This action cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-70"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
