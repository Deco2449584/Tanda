'use client';

import { useMemo, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { COLLECTIONS } from '@/lib/constants';
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
      <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) => {
      const employeeCode = employee.employeeId.toLowerCase();
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.department.toLowerCase().includes(query) ||
        employeeCode.includes(query)
      );
    });
  }, [employees, searchQuery]);

  async function handleDelete(employee: Employee) {
    if (!db) return;

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
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  const emptyMessage = searchQuery
    ? 'No employees match that search.'
    : 'No employees registered. Create the first one.';

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Photo</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Employee ID</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Full Name</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Email</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">
                Hourly Rate (Pay)
              </th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Area/Dept</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Status</th>
              <th className="px-4 py-3.5 font-semibold text-zinc-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/20"
                >
                  <td className="px-4 py-3.5">
                    <EmployeeAvatar
                      name={employee.name}
                      photoUrl={employee.photoUrl}
                    />
                  </td>
                  <td className="px-4 py-3.5 font-mono text-zinc-400">
                    {employee.employeeId || '—'}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">
                    {employee.name}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-400">{employee.email}</td>
                  <td className="px-4 py-3.5 font-semibold text-white">
                    {formatHourlyRate(employee.hourlyRate ?? 0)}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-300">
                    {employee.department || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge active={employee.active} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(employee)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                        aria-label={`Edit ${employee.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(employee)}
                        disabled={deletingId === employee.id}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Delete ${employee.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 p-4 md:hidden">
        {filteredEmployees.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          filteredEmployees.map((employee) => (
            <article
              key={employee.id}
              className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4"
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
                    <p className="font-mono text-xs text-zinc-500">
                      {employee.employeeId || '—'}
                    </p>
                  </div>
                </div>
                <StatusBadge active={employee.active} />
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="truncate text-right text-zinc-300">{employee.email}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                  <dt className="text-zinc-500">Hourly rate</dt>
                  <dd className="font-semibold text-white">
                    {formatHourlyRate(employee.hourlyRate ?? 0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Department</dt>
                  <dd className="text-right text-zinc-300">
                    {employee.department || '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end gap-2 border-t border-zinc-800/60 pt-3">
                <button
                  type="button"
                  onClick={() => onEdit(employee)}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-blue-400"
                  aria-label={`Edit ${employee.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(employee)}
                  disabled={deletingId === employee.id}
                  className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${employee.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
