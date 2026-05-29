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
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            My next shift
          </p>

          {loading ? (
            <p className="mt-3 text-sm text-zinc-500">Loading...</p>
          ) : nextShift ? (
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="text-zinc-300">
                <span className="text-zinc-500">Clock-in:</span>{' '}
                <span className="font-medium text-white">
                  {formatTimeLabel(nextShift.startTime)}
                </span>
              </p>
              <p className="text-zinc-300">
                <span className="text-zinc-500">Role:</span>{' '}
                <span className="font-medium text-white">
                  {nextShift.department}
                </span>
              </p>
              <p className="text-zinc-300">
                <span className="text-zinc-500">Date:</span>{' '}
                <span className="font-medium text-white">
                  {formatShortDate(nextShift.date)}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-400">No upcoming shifts</p>
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
