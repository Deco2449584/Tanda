'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, Pencil, X } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { PersonalProfileStatusBadge } from '@/components/employees/PersonalProfileStatusBadge';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { reviewEmployeeProfileRequest } from '@/lib/employees/employee-profile-api';
import { normalizePersonalProfileStatus } from '@/lib/employees/personal-profile-status';
import type { Employee, PersonalProfileStatus } from '@/lib/types/employee';

export type ProfileStatusFilter = 'all' | PersonalProfileStatus;

function isStaffProfileEmployee(employee: Employee): boolean {
  const role = (employee.role ?? 'empleado').trim().toLowerCase();
  return role !== 'kiosk' && role !== 'master';
}

interface EmployeeProfilesTableProps {
  employees: Employee[];
  loading: boolean;
  searchQuery: string;
  statusFilter: ProfileStatusFilter;
  canReview?: boolean;
  canUpdate?: boolean;
  onReviewed?: () => void;
}

export function EmployeeProfilesTable({
  employees,
  loading,
  searchQuery,
  statusFilter,
  canReview = false,
  canUpdate = false,
  onReviewed,
}: EmployeeProfilesTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();

    return employees.filter((employee) => {
      if (!isStaffProfileEmployee(employee)) return false;

      const status = normalizePersonalProfileStatus(employee.personalProfileStatus);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      if (!queryText) return true;
      return (
        employee.name.toLowerCase().includes(queryText) ||
        employee.email.toLowerCase().includes(queryText) ||
        employee.employeeId.toLowerCase().includes(queryText)
      );
    });
  }, [employees, searchQuery, statusFilter]);

  async function handleReview(
    employee: Employee,
    status: 'Approved' | 'Rejected',
  ) {
    let rejectionReason: string | undefined;
    if (status === 'Rejected') {
      const reason = window.prompt(`Reason for rejecting ${employee.name}'s profile:`);
      if (reason === null) return;
      rejectionReason = reason.trim();
      if (!rejectionReason) {
        window.alert('A rejection reason is required.');
        return;
      }
    }

    setUpdatingId(employee.id);
    try {
      await reviewEmployeeProfileRequest(employee.id, status, rejectionReason);
      onReviewed?.();
    } catch {
      window.alert('Could not update the profile status.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingIndicator message="Loading profiles…" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-raised/40 px-4 py-10 text-center text-sm text-muted">
        No employee profiles match this filter.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="min-w-full divide-y divide-border text-left text-sm">
        <thead className="bg-surface-raised/80 text-xs uppercase tracking-wide text-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Employee</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Documents</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface-base/30">
          {filtered.map((employee) => {
            const status = normalizePersonalProfileStatus(
              employee.personalProfileStatus,
            );
            const busy = updatingId === employee.id;

            return (
              <tr key={employee.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <EmployeeAvatar
                      name={employee.name}
                      photoUrl={employee.photoUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {employee.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {employee.employeeId} · {employee.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PersonalProfileStatusBadge status={status} />
                  {status === 'Rejected' && employee.personalProfileRejectionReason ? (
                    <p className="mt-2 max-w-xs text-xs text-red-300/90">
                      {employee.personalProfileRejectionReason}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    {employee.passportUrl ? (
                      <a
                        href={employee.passportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Passport <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-subtle">No passport</span>
                    )}
                    {employee.visaUrl ? (
                      <a
                        href={employee.visaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Visa <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-subtle">No visa</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {canReview && status === 'Pending' ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReview(employee, 'Approved')}
                          className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReview(employee, 'Rejected')}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </>
                    ) : null}
                    {canUpdate ? (
                      <Link
                        href={`/employees/${employee.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-hover"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
