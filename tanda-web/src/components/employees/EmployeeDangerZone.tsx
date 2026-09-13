'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { DeleteEmployeeConfirmModal } from '@/components/employees/DeleteEmployeeConfirmModal';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { requestEmployeeCascadeDelete } from '@/lib/admin/cascade-delete-api';
import { canDeleteStaffAccount } from '@/lib/employees/is-protected-admin';
import type { Employee } from '@/lib/types/employee';

interface EmployeeDangerZoneProps {
  employee: Employee;
}

export function EmployeeDangerZone({ employee }: EmployeeDangerZoneProps) {
  const router = useRouter();
  const { isMaster, canPerformAction } = useAdminAccess();
  const canDelete = canPerformAction('employees', 'delete');
  const canDeleteThis = canDelete && canDeleteStaffAccount(isMaster, employee);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canDelete) return null;

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await requestEmployeeCascadeDelete(employee.id);
      router.push('/employees?toast=deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete employee.');
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-red-500/30 bg-red-500/5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-red-500/10"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-red-300">Danger zone</p>
            <p className="mt-0.5 text-xs text-muted">
              Permanently delete this person and all associated staff data. Prefer
              deactivating above when you only need to revoke access.
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-red-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-red-500/20 px-5 py-4">
          {!canDeleteThis ? (
            <p className="text-sm text-muted">
              {canDeleteStaffAccount(true, employee)
                ? 'Only a Master can delete administrator accounts.'
                : 'Master accounts cannot be deleted.'}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                This removes attendance, shifts, leave, courses, documents, notifications,
                and the sign-in account. Cargo inspections they created are kept for
                company records.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPending(true);
                }}
                className="rounded-lg border border-red-500/40 bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-600/30"
              >
                Delete employee permanently…
              </button>
            </>
          )}
        </div>
      ) : null}

      <DeleteEmployeeConfirmModal
        employee={pending ? employee : null}
        loading={deleting}
        error={error}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (deleting) return;
          setPending(false);
          setError(null);
        }}
      />
    </div>
  );
}
