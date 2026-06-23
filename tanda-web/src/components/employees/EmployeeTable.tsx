'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { COLLECTIONS } from '@/lib/constants';
import { getEmployeeLocationLabel } from '@/lib/location-groups/format-location-group';
import { isProtectedAdminEmployee } from '@/lib/employees/is-protected-admin';
import { useLocationGroups } from '@/providers/LocationGroupsProvider';
import { useLocations } from '@/providers/LocationsProvider';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';

function formatHourlyRate(rate: number): string {
  return `$${rate.toFixed(2)}/hr`;
}

interface EmployeeTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  onEdit: (employee: Employee) => void;
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
      Inactive
    </span>
  );
}

export function EmployeeTable({
  employees,
  loading,
  searchQuery,
  onEdit,
}: EmployeeTableProps) {
  const { groups } = useLocationGroups();
  const { locations } = useLocations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function handleDelete(employee: Employee) {
    if (!db) return;

    if (isProtectedAdminEmployee(employee)) {
      window.alert('Administrator accounts cannot be deleted from staff management.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${employee.name}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(employee.id);

    try {
      await deleteDoc(doc(db, COLLECTIONS.EMPLOYEES, employee.id));
    } catch {
      window.alert('Could not delete the employee. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface-raised py-16">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No employees match that search.'
    : 'No employees registered. Create the first one.';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
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
              <th className="px-4 py-3.5 font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-subtle">
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
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(employee)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                        aria-label={`Edit ${employee.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee)}
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
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 p-4 md:hidden">
        {filteredEmployees.length === 0 ? (
          <p className="py-8 text-center text-sm text-subtle">{emptyMessage}</p>
        ) : (
          filteredEmployees.map((employee) => {
            const isAdminAccount = isProtectedAdminEmployee(employee);

            return (
            <article
              key={employee.id}
              className="rounded-xl border border-border/80 bg-surface-base/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <EmployeeAvatar
                    name={employee.name}
                    photoUrl={employee.photoUrl}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">
                      {employee.name}
                    </p>
                    <p className="font-mono text-xs text-subtle">
                      {employee.employeeId || '—'}
                    </p>
                  </div>
                </div>
                <StatusBadge active={employee.active} />
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                  <dt className="text-subtle">Email</dt>
                  <dd className="truncate text-right text-muted">{employee.email}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                  <dt className="text-subtle">Hourly rate</dt>
                  <dd className="font-semibold text-white">
                    {formatHourlyRate(employee.hourlyRate ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                  <dt className="text-subtle">Department</dt>
                  <dd className="text-right text-muted">
                    {employee.department || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-subtle">Location</dt>
                  <dd className="text-right text-muted">
                    {getEmployeeLocationLabel(employee, locations, groups)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => onEdit(employee)}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border-strong px-3 text-muted transition-colors hover:bg-surface-hover hover:text-primary"
                  aria-label={`Edit ${employee.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee)}
                  disabled={deletingId === employee.id || isAdminAccount}
                  title={
                    isAdminAccount
                      ? 'Administrator accounts cannot be deleted'
                      : `Delete ${employee.name}`
                  }
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border-strong px-3 text-muted transition-colors hover:bg-surface-hover hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${employee.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
          })
        )}
      </div>
    </div>
  );
}
