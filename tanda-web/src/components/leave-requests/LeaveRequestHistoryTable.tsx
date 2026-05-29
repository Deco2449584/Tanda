'use client';

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
      <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 py-16">
        <p className="text-sm text-zinc-400">Loading history...</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Request history</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="px-4 py-3 font-semibold text-zinc-300">Type</th>
              <th className="px-4 py-3 font-semibold text-zinc-300">Dates</th>
              <th className="px-4 py-3 font-semibold text-zinc-300">Justification</th>
              <th className="px-4 py-3 font-semibold text-zinc-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  You have no requests on file yet.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-zinc-800/80 hover:bg-zinc-800/20"
                >
                  <td className="px-4 py-3 text-zinc-200">{request.type}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {formatLeaveDateRange(request.startDate, request.endDate)}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-zinc-400">
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
