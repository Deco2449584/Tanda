import { formatShortDate } from '@/lib/employee-dashboard/format';
import { formatTimeLabel } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

const statusStyles = {
  scheduled: 'border-l-4 border-primary bg-primary/10',
  completed: 'border-l-4 border-primary bg-primary/10',
  absent: 'border-l-4 border-orange-500 bg-orange-950/30',
} as const;

const statusLabels = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  absent: 'Absent',
} as const;

interface ShiftListCardProps {
  shift: Shift;
}

export function ShiftListCard({ shift }: ShiftListCardProps) {
  const style = statusStyles[shift.status] ?? statusStyles.scheduled;
  const label = statusLabels[shift.status] ?? shift.status;

  return (
    <article className={`rounded-2xl border border-border p-4 ${style}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">
            {formatShortDate(shift.date)}
          </p>
          <p className="mt-1 text-sm text-muted">{label}</p>
        </div>
        <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted">
          {shift.department}
        </span>
      </div>

      <p className="mt-4 text-base font-semibold text-foreground">
        {formatTimeLabel(shift.startTime)} – {formatTimeLabel(shift.endTime)}
      </p>
    </article>
  );
}
