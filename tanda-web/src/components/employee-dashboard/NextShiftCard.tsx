import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { formatShortDate } from '@/lib/employee-dashboard/format';
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
            <div className={`space-y-1.5 text-sm ${embedded ? '' : 'mt-3'}`}>
              <p className="text-muted">
                <span className="text-subtle">Clock-in:</span>{' '}
                <span className="font-medium text-white">
                  {formatTimeLabel(nextShift.startTime)}
                </span>
              </p>
              <p className="text-muted">
                <span className="text-subtle">Role:</span>{' '}
                <span className="font-medium text-white">
                  {nextShift.department}
                </span>
              </p>
              <p className="text-muted">
                <span className="text-subtle">Date:</span>{' '}
                <span className="font-medium text-white">
                  {formatShortDate(nextShift.date)}
                </span>
              </p>
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