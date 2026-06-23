'use client';

import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { formatLeaveDateRange, truncateText } from '@/lib/leave-requests/format';
import { LeaveRequestStatusBadge } from '@/components/leave-requests/LeaveRequestStatusBadge';
import type { LeaveRequest } from '@/lib/types/leave-request';

interface LeaveRequestHistoryTableProps {
  requests: LeaveRequest[];
  loading: boolean;
}

export function LeaveRequestHistoryTable({
  requests,
  loading,
}: LeaveRequestHistoryTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border bg-surface-raised py-16">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised backdrop-blur-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Request history</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="px-4 py-3 font-semibold text-muted">Type</th>
              <th className="px-4 py-3 font-semibold text-muted">Dates</th>
              <th className="px-4 py-3 font-semibold text-muted">Justification</th>
              <th className="px-4 py-3 font-semibold text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-subtle">
                  You have no requests on file yet.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-border/80 hover:bg-surface-hover/20"
                >
                  <td className="px-4 py-3 text-foreground">{request.type}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatLeaveDateRange(request.startDate, request.endDate)}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-muted">
                    {truncateText(request.justification)}
                  </td>
                  <td className="px-4 py-3">
                    <LeaveRequestStatusBadge status={request.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
