'use client';

import { MapPin } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { ShiftConfirmationActions } from '@/components/shifts/ShiftConfirmationActions';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { formatShiftLocationLabel } from '@/lib/schedule/format-shift-location';
import { formatTimeLabel } from '@/lib/schedule/week';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';

interface NextShiftCardProps {
  employee: Employee;
  nextShift: Shift | null;
  loading: boolean;
  embedded?: boolean;
}

export function NextShiftCard({
  employee,
  nextShift,
  loading,
  embedded = false,
}: NextShiftCardProps) {
  const locationLabel = nextShift ? formatShiftLocationLabel(nextShift) : '';

  return (
    <div className={embedded ? '' : 'rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {!embedded ? (
            <p className="text-xs font-medium uppercase tracking-wide text-subtle">
              My next shift
            </p>
          ) : null}

          {loading ? (
            <LoadingIndicator />
          ) : nextShift ? (
            <div className={`space-y-2 text-sm ${embedded ? '' : 'mt-3'}`}>
              <p className="text-lg font-semibold text-white">
                {formatShortDate(nextShift.date)}
              </p>
              <p className="text-muted">
                <span className="text-subtle">Time:</span>{' '}
                <span className="font-medium text-white">
                  {formatTimeLabel(nextShift.startTime)} – {formatTimeLabel(nextShift.endTime)}
                </span>
              </p>
              {locationLabel ? (
                <p className="flex items-start gap-1.5 text-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  <span className="font-medium text-white">{locationLabel}</span>
                </p>
              ) : (
                <p className="text-xs text-subtle">Location not assigned</p>
              )}
              <ShiftConfirmationActions shift={nextShift} compact />
            </div>
          ) : (
            <p className={`text-sm text-muted ${embedded ? '' : 'mt-3'}`}>
              No upcoming shifts
            </p>
          )}
        </div>

        <EmployeeAvatar
          name={employee.name}
          photoUrl={employee.photoUrl}
          size="md"
        />
      </div>
    </div>
  );
}
