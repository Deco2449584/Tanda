'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { DeleteEmployeeConfirmModal } from '@/components/employees/DeleteEmployeeConfirmModal';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { COLLECTIONS } from '@/lib/constants';
import { getEmployeeLocationLabel } from '@/lib/location-groups/format-location-group';
import { isProtectedAdminEmployee } from '@/lib/employees/is-protected-admin';
import { requestSyncEmployeeAuth } from '@/lib/employees/request-sync-employee-auth';
import { recordEmployeeAuditEvent } from '@/lib/audit/audit-logs-client';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { useEmployees } from '@/providers/EmployeesProvider';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

function formatHourlyRate(rate: number): string {
  return `$${rate.toFixed(2)}/hr`;
}

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  onEdit?: (employee: Employee) => void;
  canDelete?: boolean;
}

function StatusBadge({
  active,
  compact = false,
}: {
  active: boolean;
  compact?: boolean;
}) {
  const sizeClass = compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  if (active) {
    return (
      <span
        className={`inline-flex shrink-0 rounded-full border border-primary/30 bg-primary/10 font-semibold text-primary ${sizeClass}`}
      >
        Active
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 rounded-full border border-red-500/30 bg-red-500/10 font-semibold text-red-400 ${sizeClass}`}
    >
      Inactive
    </span>
  );
}

export function EmployeeTable({
  employees,
  loading,
  searchQuery,
  onEdit,
  canDelete = false,
}: EmployeeTableProps) {
  const { groups } = useLocationGroups();
  const { locations } = useLocations();
  const { refresh: refreshEmployees } = useEmployees();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) => {
      const employeeCode = employee.employeeId.toLowerCase();
      const locationLabel = getEmployeeLocationLabel(employee, locations, groups).toLowerCase();
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query) ||
        locationLabel.includes(query) ||
        employeeCode.includes(query)
      );
    });
  }, [employees, groups, locations, searchQuery]);

  function requestDelete(employee: Employee) {
    if (isProtectedAdminEmployee(employee)) {
      window.alert('Administrator accounts cannot be deleted from staff management.');
      return;
    }

    setDeleteError(null);
    setPendingDelete(employee);
  }

  function cancelDelete() {
    if (deletingId) return;
    setPendingDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    const employee = pendingDelete;
    if (!db || !employee) return;

    setDeletingId(employee.id);
    setDeleteError(null);

    try {
      await requestSyncEmployeeAuth(employee.id, 'delete');
      await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id));
      void recordEmployeeAuditEvent({
        action: 'employee.deleted',
        employeeDocId: employee.id,
        summary: `Deleted employee ${employee.name} (${employee.employeeId})`,
      });
      await refreshEmployees();
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'Could not delete the employee. Please try again.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading staff…" />
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No employees match that search.'
    : 'No employees registered. Create the first one.';
  const showActions = Boolean(onEdit) || canDelete;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="hidden overflow-x-auto scrollbar-modern md:block">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3.5 font-semibold text-white">Photo</th>
              <th className="px-4 py-3.5 font-semibold text-white">Employee ID</th>
              <th className="px-4 py-3.5 font-semibold text-white">Full Name</th>
              <th className="px-4 py-3.5 font-semibold text-white">Email</th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Hourly Rate (Pay)
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">Area/Dept</th>
              <th className="px-4 py-3.5 font-semibold text-white">Location</th>
              <th className="px-4 py-3.5 font-semibold text-white">Status</th>
              {showActions ? (
                <th className="px-4 py-3.5 font-semibold text-white">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={showActions ? 9 : 8} className="px-4 py-12 text-center text-subtle">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => {
                const isAdminAccount = isProtectedAdminEmployee(employee);

                return (
                <tr
                  key={employee.id}
                  className="border-b border-border/80 transition-colors hover:bg-surface-hover/20"
                >
                  <td className="px-4 py-3.5">
                    <EmployeeAvatar
                      name={employee.name}
                      photoUrl={employee.photoUrl}
                    />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-muted">
                    {employee.employeeId || '—'}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">
                    {employee.name}
                  </td>
                  <td className="px-4 py-3.5 text-muted">{employee.email}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {formatHourlyRate(employee.hourlyRate ?? 0)}
                  </td>
                  <td className="px-4 py-3.5 text-muted">
                    {employee.department || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-muted">
                    {getEmployeeLocationLabel(employee, locations, groups)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge active={employee.active} />
                  </td>
                  {showActions ? (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {onEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(employee)}
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                            aria-label={`Edit ${employee.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => requestDelete(employee)}
                            disabled={deletingId === employee.id || isAdminAccount}
                            title={
                              isAdminAccount
                                ? 'Administrator accounts cannot be deleted'
                                : `Delete ${employee.name}`
                            }
                            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${employee.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border/80 md:hidden">
        {filteredEmployees.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-subtle">{emptyMessage}</li>
        ) : (
          filteredEmployees.map((employee) => {
            const isAdminAccount = isProtectedAdminEmployee(employee);
            const locationLabel = getEmployeeLocationLabel(employee, locations, groups);
            const metaParts = [
              employee.employeeId || null,
              employee.department || null,
              locationLabel !== '—' ? locationLabel : null,
              formatHourlyRate(employee.hourlyRate ?? 0),
            ].filter(Boolean);

            return (
              <li key={employee.id}>
                <article className="flex items-center gap-3 px-4 py-3">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employee.photoUrl}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {metaParts.join(' · ')}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-subtle">
                      {employee.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge active={employee.active} compact />

                    {showActions ? (
                      <div className="flex items-center gap-0.5">
                        {onEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(employee)}
                            className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-primary"
                            aria-label={`Edit ${employee.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => requestDelete(employee)}
                            disabled={deletingId === employee.id || isAdminAccount}
                            title={
                              isAdminAccount
                                ? 'Administrator accounts cannot be deleted'
                                : `Delete ${employee.name}`
                            }
                            className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-hover hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Delete ${employee.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })
        )}
      </ul>

      <DeleteEmployeeConfirmModal
        employee={pendingDelete}
        loading={Boolean(deletingId)}
        error={deleteError}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={cancelDelete}
      />
    </div>
  );
}
