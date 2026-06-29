'use client';

import { useMemo } from 'react';
import { CollapsibleDashboardCard } from '@/components/dashboard/CollapsibleDashboardCard';
import { EmployeeIdCard } from '@/components/employee-dashboard/EmployeeIdCard';
import { EmployeeWeeklySchedule } from '@/components/employee-dashboard/EmployeeWeeklySchedule';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonthlyHoursCard } from '@/components/employee-dashboard/MonthlyHoursCard';
import { NextShiftCard } from '@/components/employee-dashboard/NextShiftCard';
import { WeeklyHoursCard } from '@/components/employee-dashboard/WeeklyHoursCard';
import { useEmployeeAttendance } from '@/hooks/useEmployeeAttendance';
import { useEmployeeOverviewLayout } from '@/hooks/useEmployeeOverviewLayout';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';
import {
  calculateWorkedHoursInRange,
  getMonthDateRange,
} from '@/lib/attendance/work-sessions';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { formatTimeLabel } from '@/lib/schedule/week';

export default function EmployeeDashboardPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { settings } = useCompanySettings();
  const { isSectionCollapsed, toggleSectionCollapsed } = useEmployeeOverviewLayout();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);

  const employeeCode = employee?.employeeId ?? '';

  const {
    week,
    shiftsByDate,
    nextScheduledShift,
    loading: shiftsLoading,
    error: shiftsError,
  } = useEmployeeShifts({ employeeCode });

  const {
    allRecords: attendanceRecords,
    loading: recordsLoading,
    error: recordsError,
  } = useEmployeeAttendance({ employeeCode, displayRange: 'month' });

  const weeklyHours = useMemo(
    () =>
      calculateWorkedHoursInRange(
        attendanceRecords,
        week.start,
        week.end,
        settings.attendanceBreak,
      ),
    [attendanceRecords, week.end, week.start, settings.attendanceBreak],
  );

  const monthlyHours = useMemo(() => {
    const { start, end } = getMonthDateRange();
    return calculateWorkedHoursInRange(
      attendanceRecords,
      start,
      end,
      settings.attendanceBreak,
    );
  }, [attendanceRecords, settings.attendanceBreak]);

  const scheduledCount = useMemo(
    () => Object.keys(shiftsByDate).length,
    [shiftsByDate],
  );

  const dataLoading = shiftsLoading || recordsLoading;
  const dataError = shiftsError || recordsError;

  const weeklyHoursSummary = recordsLoading
    ? 'Loading…'
    : `${Math.round(weeklyHours * 10) / 10} hrs this week`;

  const monthlyHoursSummary = recordsLoading
    ? 'Loading…'
    : `${Math.round(monthlyHours * 10) / 10} hrs this month`;

  const nextShiftSummary = shiftsLoading
    ? 'Loading…'
    : nextScheduledShift
      ? `${formatShortDate(nextScheduledShift.date)} · ${formatTimeLabel(nextScheduledShift.startTime)}`
      : 'No upcoming shifts';

  const weeklyScheduleSummary = shiftsLoading
    ? 'Loading…'
    : `${scheduledCount} shift${scheduledCount === 1 ? '' : 's'} this week`;

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader title="My overview" />

      {employeeError && !employeeLoading && (
        <p className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {employeeError}
        </p>
      )}

      {dataError && employee && !dataLoading && (
        <p className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
          {dataError}
        </p>
      )}

      {employee && (
        <div className="space-y-4">
          <CollapsibleDashboardCard
            title="Your employee ID"
            description="Use this number at the warehouse time clock when you clock in or out."
            summary={employee.employeeId || 'Not assigned yet'}
            collapsed={isSectionCollapsed('employee-id')}
            onToggle={() => toggleSectionCollapsed('employee-id')}
          >
            <EmployeeIdCard
              employeeId={employee.employeeId}
              loading={employeeLoading}
              embedded
            />
          </CollapsibleDashboardCard>

          <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
            <CollapsibleDashboardCard
              title="Total weekly hours"
              summary={weeklyHoursSummary}
              collapsed={isSectionCollapsed('weekly-hours')}
              onToggle={() => toggleSectionCollapsed('weekly-hours')}
            >
              <WeeklyHoursCard hours={weeklyHours} loading={recordsLoading} embedded />
            </CollapsibleDashboardCard>

            <CollapsibleDashboardCard
              title="Total monthly hours"
              summary={monthlyHoursSummary}
              collapsed={isSectionCollapsed('monthly-hours')}
              onToggle={() => toggleSectionCollapsed('monthly-hours')}
            >
              <MonthlyHoursCard hours={monthlyHours} loading={recordsLoading} embedded />
            </CollapsibleDashboardCard>

            <CollapsibleDashboardCard
              title="My next shift"
              summary={nextShiftSummary}
              collapsed={isSectionCollapsed('next-shift')}
              onToggle={() => toggleSectionCollapsed('next-shift')}
            >
              <NextShiftCard
                employee={employee}
                nextShift={nextScheduledShift}
                loading={shiftsLoading}
                embedded
              />
            </CollapsibleDashboardCard>
          </div>

          <EmployeeWeeklySchedule
            weekDays={week.days}
            weekStart={week.start}
            weekEnd={week.end}
            shiftsByDate={shiftsByDate}
            loading={shiftsLoading}
            collapsible
            collapsed={isSectionCollapsed('weekly-schedule')}
            onToggleCollapse={() => toggleSectionCollapsed('weekly-schedule')}
            collapseSummary={weeklyScheduleSummary}
          />
        </div>
      )}
    </PageContent>
  );
}
