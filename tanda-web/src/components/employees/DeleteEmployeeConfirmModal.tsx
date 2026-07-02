'use client';

import { useEffect, useState } from 'react';
import type { Employee } from '@/lib/types/employee';

export const DELETE_EMPLOYEE_CONFIRM_PHRASE = 'DELETE';

interface DeleteEmployeeConfirmModalProps {
  employee: Employee | null;
  loading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteEmployeeConfirmModal({
  employee,
  loading,
  error = null,
  onConfirm,
  onCancel,
}: DeleteEmployeeConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (employee) {
      setConfirmText('');
    }
  }, [employee]);

  if (!employee) return null;

  const canConfirm = confirmText.trim() === DELETE_EMPLOYEE_CONFIRM_PHRASE && !loading;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-employee-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onCancel}
        disabled={loading}
      />

      <div className="relative z-10 w-[95%] rounded-xl border border-red-500/30 bg-surface-raised p-6 shadow-2xl md:w-full md:max-w-md">
        <h2 id="delete-employee-title" className="text-lg font-semibold text-white">
          Delete employee
        </h2>
        <p className="mt-2 text-sm text-muted">
          You are about to permanently delete{' '}
          <span className="font-medium text-foreground">{employee.name}</span>
          {employee.employeeId ? (
            <>
              {' '}
              (<span className="font-mono">{employee.employeeId}</span>)
            </>
          ) : null}
          . Their sign-in access will be removed and this cannot be undone.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-surface-base/50 p-4">
          <p className="text-xs text-subtle">
            Type{' '}
            <span className="font-mono font-semibold text-red-300">
              {DELETE_EMPLOYEE_CONFIRM_PHRASE}
            </span>{' '}
            to confirm.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={loading}
            placeholder={DELETE_EMPLOYEE_CONFIRM_PHRASE}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-red-500/50 disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
            aria-label="Type DELETE to confirm"
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
            className="flex h-10 flex-1 items-center justify-center rounded-lg border border-border-strong text-sm text-muted hover:bg-surface-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex h-10 flex-1 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete employee'}
          </button>
        </div>
      </div>
    </div>
  );
}
