'use client';

import { ShiftConfirmationActions } from '@/components/shifts/ShiftConfirmationActions';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { getShiftStatusMeta } from '@/lib/employee-dashboard/shift-status-styles';
import { formatShiftLocationLabel } from '@/lib/schedule/format-shift-location';
import { formatTimeLabel } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

interface ShiftListCardProps {
  shift: Shift;
  onUpdated?: () => void;
}

export function ShiftListCard({ shift, onUpdated }: ShiftListCardProps) {
  const meta = getShiftStatusMeta(shift.status);
  const StatusIcon = meta.icon;
  const locationLabel = formatShiftLocationLabel(shift);

  return (
    <article className={`rounded-2xl border p-4 ${meta.listCardClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">
            {formatShortDate(shift.date)}
          </p>
          <span
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.chipClass}`}
          >
            <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {meta.label}
          </span>
        </div>
        <span className="rounded-full border border-border/80 bg-surface-base/60 px-2.5 py-1 text-xs font-medium text-muted">
          {locationLabel || shift.department}
        </span>
      </div>

      {locationLabel && shift.department ? (
        <p className="mt-2 text-xs text-subtle">{shift.department}</p>
      ) : null}

      <p className="mt-4 text-base font-semibold text-foreground">
        {formatTimeLabel(shift.startTime)} – {formatTimeLabel(shift.endTime)}
      </p>

      <ShiftConfirmationActions
        shift={shift}
        onUpdated={onUpdated ? () => onUpdated() : undefined}
      />
    </article>
  );
}
