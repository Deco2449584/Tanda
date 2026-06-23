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
}

export function NextShiftCard({
  employee,
  nextShift,
  loading,
}: NextShiftCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">
            My next shift
          </p>

          {loading ? (
            <LoadingIndicator />
          ) : nextShift ? (
            <div className="mt-3 space-y-1.5 text-sm">
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
            <p className="mt-3 text-sm text-muted">No upcoming shifts</p>
          )}
        </div>

        <EmployeeAvatar
          name={employee.name}
          photoUrl={employee.photoUrl}
          size="md"
        />
      </div>
    </article>
  );
}
