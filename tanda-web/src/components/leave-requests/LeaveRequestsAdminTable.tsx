'use client';

import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { LeaveRequestStatusBadge } from '@/components/leave-requests/LeaveRequestStatusBadge';
import { COLLECTIONS } from '@/lib/constants';
import {
  formatLeaveDateRange,
  truncateText,
} from '@/lib/leave-requests/format';
import { db } from '@/lib/firebase';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest, LeaveRequestStatus } from '@/lib/types/leave-request';

interface LeaveRequestsAdminTableProps {
  requests: LeaveRequest[];
  employeesByCode: Record<string, Employee>;
  loading: boolean;
  searchQuery: string;
}

export function LeaveRequestsAdminTable({
  requests,
  employeesByCode,
  loading,
  searchQuery,
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
    if (!db) return;

    setUpdatingId(requestId);

    try {
      await updateDoc(doc(db, COLLECTIONS.LEAVE_REQUESTS, requestId), {
        status,
      });
    } catch {
      window.alert('Could not update the request status.');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Loading requests...</p>
      </div>
    );
  }

  const emptyMessage = 'No requests match the current filters.';

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/20 bg-primary/10">
              <th className="px-4 py-3.5 font-semibold text-primary/90">Photo</th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Employee ID
              </th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Leave type
              </th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Date range
              </th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Justification (summary)
              </th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Status
              </th>
              <th className="px-4 py-3.5 font-semibold text-primary/90">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
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
                    className={`border-b border-zinc-800/80 transition-colors hover:bg-zinc-800/20 ${
                      index % 2 === 1 ? 'bg-zinc-950/30' : ''
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
                      <p className="font-mono text-zinc-400">
                        {request.employeeId}
                      </p>
                      <p className="text-sm font-medium text-white">
                        {employee?.name ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-zinc-200">{request.type}</td>
                    <td className="px-4 py-3.5 text-zinc-300">
                      {formatLeaveDateRange(request.startDate, request.endDate)}
                    </td>
                    <td className="max-w-[240px] px-4 py-3.5 text-zinc-400">
                      {truncateText(request.justification, 56)}
                    </td>
                    <td className="px-4 py-3.5">
                      <LeaveRequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      {isPending ? (
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-primary/80 transition-colors hover:bg-zinc-800 hover:text-primary"
                            aria-label="Edit request"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-primary/80 transition-colors hover:bg-zinc-800 hover:text-red-400"
                            aria-label="Delete request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
          <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          filteredRequests.map((request) => {
            const employee = employeesByCode[request.employeeId];
            const isPending = request.status === 'Pending';
            const isUpdating = updatingId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-4"
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
                    <p className="font-mono text-xs text-zinc-500">{request.employeeId}</p>
                  </div>
                  <LeaveRequestStatusBadge status={request.status} />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                    <dt className="text-zinc-500">Leave type</dt>
                    <dd className="text-right text-zinc-200">{request.type}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-zinc-800/60 pb-2">
                    <dt className="text-zinc-500">Date range</dt>
                    <dd className="text-right text-zinc-300">
                      {formatLeaveDateRange(request.startDate, request.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Justification</dt>
                    <dd className="mt-1 text-zinc-400">
                      {truncateText(request.justification, 120)}
                    </dd>
                  </div>
                </dl>

                {isPending ? (
                  <div className="mt-4 flex gap-2 border-t border-zinc-800/60 pt-3">
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
                  <div className="mt-4 flex justify-end gap-2 border-t border-zinc-800/60 pt-3">
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-primary/80 transition-colors hover:bg-zinc-800 hover:text-primary"
                      aria-label="Edit request"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-zinc-700 px-3 text-primary/80 transition-colors hover:bg-zinc-800 hover:text-red-400"
                      aria-label="Delete request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
