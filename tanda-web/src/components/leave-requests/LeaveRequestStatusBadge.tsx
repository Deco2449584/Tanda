import type { LeaveRequestStatus } from '@/lib/types/leave-request';

const statusStyles: Record<
  LeaveRequestStatus,
  { className: string; label: string }
> = {
  Pending: {
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    label: 'Pending',
  },
  Approved: {
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    label: 'Approved',
  },
  Rejected: {
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
    label: 'Rejected',
  },
};

export function LeaveRequestStatusBadge({
  status,
}: {
  status: LeaveRequestStatus;
}) {
  const styles = statusStyles[status];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles.className}`}
    >
      {styles.label}
    </span>
  );
}
