'use client';

import { useMemo, useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { LeaveRequestStatusBadge } from '@/components/leave-requests/LeaveRequestStatusBadge';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { updateLeaveRequestStatusRequest } from '@/lib/leave-requests/leave-requests-api';
import {
  formatLeaveDateRange,
  truncateText,
} from '@/lib/leave-requests/format';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

interface LeaveRequestsAdminTableProps {
  requests: LeaveRequest[];
  employeesByCode: Record<string, Employee>;
  loading: boolean;
  searchQuery: string;
  canManage?: boolean;
}

export function LeaveRequestsAdminTable({
  requests,
  employeesByCode,
  loading,
  searchQuery,
  canManage = true,
}: LeaveRequestsAdminTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return requests;

    return requests.filter((request) => {
      const employee = employeesByCode[request.employeeId];
      const name = employee?.name.toLowerCase() ?? '';
      const code = request.employeeId.toLowerCase();
      return (
        name.includes(queryText) ||
        code.includes(queryText) ||
        request.type.toLowerCase().includes(queryText)
      );
    });
  }, [requests, searchQuery, employeesByCode]);

  async function updateStatus(
    requestId: string,
    status: Exclude<LeaveRequestStatus, 'Pending'>,
  ) {
    setUpdatingId(requestId);

    try {
      await updateLeaveRequestStatusRequest(requestId, status);
    } catch {
      window.alert('Could not update the request status.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised">
        <LoadingIndicator message="Loading requests…" />
      </div>
    );
  }

  const emptyMessage = 'No requests match the current filters.';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3.5 font-semibold text-white">Photo</th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Employee ID
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Leave type
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Date range
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Justification (summary)
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Status
              </th>
              <th className="px-4 py-3.5 font-semibold text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-subtle">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredRequests.map((request, index) => {
                const employee = employeesByCode[request.employeeId];
                const isPending = request.status === 'Pending';
                const isUpdating = updatingId === request.id;

                return (
                  <tr
                    key={request.id}
                    className={`border-b border-border/80 transition-colors hover:bg-surface-hover/20 ${
                      index % 2 === 1 ? 'bg-surface-base/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <EmployeeAvatar
                        name={employee?.name ?? request.employeeId}
                        photoUrl={employee?.photoUrl}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-muted">
                        {request.employeeId}
                      </p>
                      <p className="text-sm font-medium text-white">
                        {employee?.name ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">{request.type}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {formatLeaveDateRange(request.startDate, request.endDate)}
                    </td>
                    <td className="max-w-[240px] px-4 py-3.5 text-muted">
                      {truncateText(request.justification, 56)}
                    </td>
                    <td className="px-4 py-3.5">
                      <LeaveRequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
                        canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateStatus(request.id, 'Approved')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              APPROVE
                            </button>
                            <button
                              type="button"
                              onClick={() => updateStatus(request.id, 'Rejected')}
                              disabled={isUpdating}
                              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              REJECT
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-subtle">View only</span>
                        )
                      ) : canManage ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-primary/80 transition-colors hover:bg-surface-hover hover:text-primary"
                            aria-label="Edit request"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-primary/80 transition-colors hover:bg-surface-hover hover:text-red-400"
                            aria-label="Delete request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-subtle">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 p-4 md:hidden">
        {filteredRequests.length === 0 ? (
          <p className="py-8 text-center text-sm text-subtle">{emptyMessage}</p>
        ) : (
          filteredRequests.map((request) => {
            const employee = employeesByCode[request.employeeId];
            const isPending = request.status === 'Pending';
            const isUpdating = updatingId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-xl border border-border/80 bg-surface-base/40 p-4"
              >
                <div className="flex items-start gap-3">
                  <EmployeeAvatar
                    name={employee?.name ?? request.employeeId}
                    photoUrl={employee?.photoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold text-white">
                      {employee?.name ?? request.employeeId}
                    </p>
                    <p className="font-mono text-xs text-subtle">{request.employeeId}</p>
                  </div>
                  <LeaveRequestStatusBadge status={request.status} />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                    <dt className="text-subtle">Leave type</dt>
                    <dd className="text-right text-foreground">{request.type}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
                    <dt className="text-subtle">Date range</dt>
                    <dd className="text-right text-muted">
                      {formatLeaveDateRange(request.startDate, request.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Justification</dt>
                    <dd className="mt-1 text-muted">
                      {truncateText(request.justification, 120)}
                    </dd>
                  </div>
                </dl>

                {isPending ? (
                  canManage ? (
                    <div className="mt-4 flex gap-2 border-t border-border/60 pt-3">
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, 'Approved')}
                        disabled={isUpdating}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" />
                        APPROVE
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(request.id, 'Rejected')}
                        disabled={isUpdating}
                        className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-red-600 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" />
                        REJECT
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-border/60 pt-3 text-center text-xs text-subtle">
                      View only — you cannot approve or reject requests.
                    </p>
                  )
                ) : canManage ? (
                  <div className="mt-4 flex justify-end gap-2 border-t border-border/60 pt-3">
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border-strong px-3 text-primary/80 transition-colors hover:bg-surface-hover hover:text-primary"
                      aria-label="Edit request"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-border-strong px-3 text-primary/80 transition-colors hover:bg-surface-hover hover:text-red-400"
                      aria-label="Delete request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 border-t border-border/60 pt-3 text-center text-xs text-subtle">
                    View only
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
