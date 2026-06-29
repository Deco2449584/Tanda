'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';

import { SubmitJustificationModal } from '@/components/attendance/SubmitJustificationModal';
import { CollapsibleDashboardCard } from '@/components/dashboard/CollapsibleDashboardCard';
import { EmployeeWeeklySchedule } from '@/components/employee-dashboard/EmployeeWeeklySchedule';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { ShiftListCard } from '@/components/my-schedule/ShiftListCard';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeOverviewLayout } from '@/hooks/useEmployeeOverviewLayout';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { formatTimeLabel } from '@/lib/schedule/week';

export default function MySchedulePage() {
  const searchParams = useSearchParams();
  const [justifyId, setJustifyId] = useState<string | null>(null);
  const { isSectionCollapsed, toggleSectionCollapsed } = useEmployeeOverviewLayout();
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

  const scheduledCount = Object.keys(shiftsByDate).length;
  const weeklyScheduleSummary = shiftsLoading
    ? 'Loading…'
    : `${scheduledCount} shift${scheduledCount === 1 ? '' : 's'} this week`;

  const upcomingSummary = shiftsLoading
    ? 'Loading…'
    : futureShifts.length === 0
      ? 'No upcoming shifts'
      : `${futureShifts.length} shift${futureShifts.length === 1 ? '' : 's'} · next ${formatShortDate(futureShifts[0].date)} ${formatTimeLabel(futureShifts[0].startTime)}`;

  useEffect(() => {
    const requestedId = searchParams.get('justify');
    if (requestedId) {
      setJustifyId(requestedId);
    }
  }, [searchParams]);

  return (
    <PageContent className="space-y-5">
      <PageHeader title="My schedule" />
      <SubmitJustificationModal
        justificationId={justifyId}
        onClose={() => setJustifyId(null)}
      />

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
        <div className="space-y-4">
          <EmployeeWeeklySchedule
            weekDays={week.days}
            weekStart={week.start}
            weekEnd={week.end}
            shiftsByDate={shiftsByDate}
            loading={shiftsLoading}
            showViewAllLink={false}
            collapsible
            collapsed={isSectionCollapsed('weekly-schedule')}
            onToggleCollapse={() => toggleSectionCollapsed('weekly-schedule')}
            collapseSummary={weeklyScheduleSummary}
          />

          <CollapsibleDashboardCard
            title="Upcoming shifts"
            description="Your next scheduled shifts in chronological order."
            summary={upcomingSummary}
            collapsed={isSectionCollapsed('upcoming-shifts')}
            onToggle={() => toggleSectionCollapsed('upcoming-shifts')}
          >
            {loading ? (
              <LoadingIndicator />
            ) : futureShifts.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface-base/40 px-4 py-8 text-center text-sm text-subtle">
                You have no upcoming shifts scheduled.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {futureShifts.map((shift) => (
                  <ShiftListCard key={shift.id} shift={shift} />
                ))}
              </div>
            )}
          </CollapsibleDashboardCard>
        </div>
      )}
    </PageContent>
  );
}
