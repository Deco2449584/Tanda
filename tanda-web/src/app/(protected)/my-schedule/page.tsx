'use client';

import { EmployeeWeeklySchedule } from '@/components/employee-dashboard/EmployeeWeeklySchedule';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { ShiftListCard } from '@/components/my-schedule/ShiftListCard';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';

export default function MySchedulePage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);

  const employeeCode = employee?.employeeId ?? '';

  const {
    week,
    shiftsByDate,
    futureShifts,
    loading: shiftsLoading,
    error: shiftsError,
  } = useEmployeeShifts({ employeeCode });

  const loading = authLoading || employeeLoading || shiftsLoading;

  return (
    <PageContent className="space-y-5">
      <PageHeader title="My schedule" />

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {shiftsError && employee && !shiftsLoading && (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {shiftsError}
        </p>
      )}

      {employee && (
        <>
          <EmployeeWeeklySchedule
            weekDays={week.days}
            weekStart={week.start}
            weekEnd={week.end}
            shiftsByDate={shiftsByDate}
            loading={shiftsLoading}
            showViewAllLink={false}
          />

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Upcoming shifts</h2>

            {loading && (
              <p className="text-sm text-muted">Loading shifts...</p>
            )}

            {!loading && futureShifts.length === 0 && (
              <p className="rounded-xl border border-border bg-surface-raised px-4 py-8 text-center text-sm text-subtle">
                You have no upcoming shifts scheduled.
              </p>
            )}

            {!loading && futureShifts.length > 0 && (
              <div className="flex flex-col gap-4">
                {futureShifts.map((shift) => (
                  <ShiftListCard key={shift.id} shift={shift} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </PageContent>
  );
}
