'use client';

import { useMemo, useState } from 'react';
import { CollapsibleDashboardCard } from '@/components/dashboard/CollapsibleDashboardCard';
import {
  EmployeeHoursEarningsCard,
  formatHoursEarningsSummary,
  type HoursEarningsPeriod,
} from '@/components/employee-dashboard/EmployeeHoursEarningsCard';
import { EmployeeIdCard } from '@/components/employee-dashboard/EmployeeIdCard';
import { EmployeeWeeklySchedule } from '@/components/employee-dashboard/EmployeeWeeklySchedule';
import { NextShiftCard } from '@/components/employee-dashboard/NextShiftCard';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useEmployeeAttendance } from '@/hooks/useEmployeeAttendance';
import { useEmployeeOverviewLayout } from '@/hooks/useEmployeeOverviewLayout';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';
import {
  calculateWorkedHoursInRange,
  getMonthDateRange,
  getYearDateRange,
} from '@/lib/attendance/work-sessions';
import { formatShiftLocationLabel } from '@/lib/schedule/format-shift-location';
import { formatShortDate } from '@/lib/employee-dashboard/format';
import { formatTimeLabel } from '@/lib/schedule/week';

function resolveHoursRange(
  period: HoursEarningsPeriod,
  weekStart: string,
  weekEnd: string,
) {
  if (period === 'week') return { start: weekStart, end: weekEnd };
  if (period === 'month') return getMonthDateRange();
  return getYearDateRange();
}

export default function EmployeeDashboardPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { settings } = useCompanySettings();
  const { isSectionCollapsed, toggleSectionCollapsed } = useEmployeeOverviewLayout();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);
  const [hoursPeriod, setHoursPeriod] = useState<HoursEarningsPeriod>('week');

  const employeeCode = employee?.employeeId ?? '';
  const hourlyRate = employee?.hourlyRate ?? 0;

  const {
    week,
    shiftsByDate,
    nextScheduledShift,
    loading: shiftsLoading,
    refreshing: shiftsRefreshing,
    error: shiftsError,
    refresh: refreshShifts,
  } = useEmployeeShifts({ employeeCode });

  const {
    allRecords: attendanceRecords,
    loading: recordsLoading,
    refreshing: recordsRefreshing,
    error: recordsError,
    refresh: refreshRecords,
  } = useEmployeeAttendance({ employeeCode, displayRange: 'all' });

  const hoursEarningsStats = useMemo(() => {
    const range = resolveHoursRange(hoursPeriod, week.start, week.end);
    const hours = calculateWorkedHoursInRange(
      attendanceRecords,
      range.start,
      range.end,
      settings.attendanceBreak,
    );
    const earnings = Math.round(hours * hourlyRate * 100) / 100;
    return { hours, earnings };
  }, [
    attendanceRecords,
    hourlyRate,
    hoursPeriod,
    settings.attendanceBreak,
    week.end,
    week.start,
  ]);

  const scheduledCount = useMemo(
    () => Object.keys(shiftsByDate).length,
    [shiftsByDate],
  );

  const dataLoading = shiftsLoading || recordsLoading;
  const dataError = shiftsError || recordsError;

  const hoursEarningsSummary = recordsLoading
    ? 'Loading…'
    : formatHoursEarningsSummary(
        hoursEarningsStats.hours,
        hoursEarningsStats.earnings,
        settings.currency,
        hoursPeriod,
        hourlyRate,
      );

  const nextShiftSummary = shiftsLoading
    ? 'Loading…'
    : nextScheduledShift
      ? (() => {
          const location = formatShiftLocationLabel(nextScheduledShift);
          const base = `${formatShortDate(nextScheduledShift.date)} · ${formatTimeLabel(nextScheduledShift.startTime)}`;
          return location ? `${base} · ${location}` : base;
        })()
      : 'No upcoming shifts';

  const weeklyScheduleSummary = shiftsLoading
    ? 'Loading…'
    : `${scheduledCount} shift${scheduledCount === 1 ? '' : 's'} this week`;

  const isRefreshing = shiftsRefreshing || recordsRefreshing;

  function handleRefresh() {
    void Promise.all([refreshShifts(), refreshRecords()]);
  }

  return (
    <PageContent className="space-y-5 md:space-y-6">
      <PageHeader
        title="My overview"
        actions={
          <RefreshButton
            onClick={handleRefresh}
            refreshing={isRefreshing}
            disabled={dataLoading}
          />
        }
      />

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

          <CollapsibleDashboardCard
            title="Hours & earnings"
            summary={hoursEarningsSummary}
            collapsed={isSectionCollapsed('hours-earnings')}
            onToggle={() => toggleSectionCollapsed('hours-earnings')}
          >
            <EmployeeHoursEarningsCard
              records={attendanceRecords}
              weekStart={week.start}
              weekEnd={week.end}
              hourlyRate={hourlyRate}
              currency={settings.currency}
              loading={recordsLoading}
              breakSettings={settings.attendanceBreak}
              embedded
              period={hoursPeriod}
              onPeriodChange={setHoursPeriod}
            />
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
              onShiftUpdated={() => void refreshShifts()}
            />
          </CollapsibleDashboardCard>

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
