'use client';

import { useMemo } from 'react';
import { EmployeeIdCard } from '@/components/employee-dashboard/EmployeeIdCard';
import { EmployeeWeeklySchedule } from '@/components/employee-dashboard/EmployeeWeeklySchedule';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { MonthlyHoursCard } from '@/components/employee-dashboard/MonthlyHoursCard';
import { NextShiftCard } from '@/components/employee-dashboard/NextShiftCard';
import { WeeklyHoursCard } from '@/components/employee-dashboard/WeeklyHoursCard';
import { useEmployeeAttendance } from '@/hooks/useEmployeeAttendance';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';
import {
  calculateWorkedHoursInRange,
  getMonthDateRange,
} from '@/lib/attendance/work-sessions';

export default function EmployeeDashboardPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { settings } = useCompanySettings();
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

  const dataLoading = shiftsLoading || recordsLoading;
  const loading = authLoading || employeeLoading || dataLoading;
  const dataError = shiftsError || recordsError;

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
        <>
          <EmployeeIdCard
            employeeId={employee.employeeId}
            loading={employeeLoading}
          />

          <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
            <WeeklyHoursCard hours={weeklyHours} loading={recordsLoading} />
            <MonthlyHoursCard hours={monthlyHours} loading={recordsLoading} />
            <NextShiftCard
              employee={employee}
              nextShift={nextScheduledShift}
              loading={shiftsLoading}
            />
          </div>

          <EmployeeWeeklySchedule
            weekDays={week.days}
            weekStart={week.start}
            weekEnd={week.end}
            shiftsByDate={shiftsByDate}
            loading={shiftsLoading}
          />
        </>
      )}
    </PageContent>
  );
}
