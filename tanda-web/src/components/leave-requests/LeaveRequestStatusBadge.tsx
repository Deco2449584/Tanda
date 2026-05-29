import type { LeaveRequestStatus } from '@/lib/types/leave-request';

const statusStyles: Record<
  LeaveRequestStatus,
  { className: string; label: string }
> = {
  Pendiente: {
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    label: 'Pendiente',
  },
  Aprobado: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    label: 'Aprobado',
  },
  Rechazado: {
    className: 'border-red-500/30 bg-red-500/10 text-red-400',
    label: 'Rechazado',
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
