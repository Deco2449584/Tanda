'use client';

import { useMemo, useState } from 'react';
import { MonthlyHoursCard } from '@/components/employee-dashboard/MonthlyHoursCard';
import { NextShiftCard } from '@/components/employee-dashboard/NextShiftCard';
import { RecentRecordsTable } from '@/components/employee-dashboard/RecentRecordsTable';
import { WeeklyHoursCard } from '@/components/employee-dashboard/WeeklyHoursCard';
import { WeeklyScheduleStrip } from '@/components/employee-dashboard/WeeklyScheduleStrip';
import {
  useEmployeeAttendance,
  type EmployeeRecordsRange,
} from '@/hooks/useEmployeeAttendance';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCurrentEmployee } from '@/hooks/useCurrentEmployee';
import { useEmployeeShifts } from '@/hooks/useEmployeeShifts';
import {
  calculateWorkedHoursInRange,
  getMonthDateRange,
} from '@/lib/attendance/work-sessions';

export default function EmployeeDashboardPage() {
  const { user, loading: authLoading } = useAuthRole();
  const { employee, loading: employeeLoading, error: employeeError } =
    useCurrentEmployee(user?.email);
  const [recordsRange, setRecordsRange] =
    useState<EmployeeRecordsRange>('7days');

  const employeeCode = employee?.employeeId ?? '';

  const {
    week,
    shiftsByDate,
    nextScheduledShift,
    loading: shiftsLoading,
    error: shiftsError,
  } = useEmployeeShifts({ employeeCode });

  const {
    records: displayRecords,
    allRecords: attendanceRecords,
    loading: recordsLoading,
    error: recordsError,
  } = useEmployeeAttendance({ employeeCode, displayRange: recordsRange });

  const weeklyHours = useMemo(
    () =>
      calculateWorkedHoursInRange(
        attendanceRecords,
        week.start,
        week.end,
      ),
    [attendanceRecords, week.end, week.start],
  );

  const monthlyHours = useMemo(() => {
    const { start, end } = getMonthDateRange();
    return calculateWorkedHoursInRange(attendanceRecords, start, end);
  }, [attendanceRecords]);

  const dataLoading = shiftsLoading || recordsLoading;
  const loading = authLoading || employeeLoading || dataLoading;
  const dataError = shiftsError || recordsError;

  return (
    <div className="min-h-full space-y-5 bg-[#121212] p-4 md:space-y-6 md:p-6">
      <h1 className="text-sm font-bold tracking-wide text-white uppercase md:text-base">
        Mi resumen general
      </h1>

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
          <div className="flex flex-col gap-4 md:grid md:grid-cols-3">
            <WeeklyHoursCard hours={weeklyHours} loading={recordsLoading} />
            <MonthlyHoursCard hours={monthlyHours} loading={recordsLoading} />
            <NextShiftCard
              employee={employee}
              nextShift={nextScheduledShift}
              loading={shiftsLoading}
            />
          </div>

          <RecentRecordsTable
            records={displayRecords}
            loading={recordsLoading}
            range={recordsRange}
            onRangeChange={setRecordsRange}
          />

          <WeeklyScheduleStrip
            weekDays={week.days}
            shiftsByDate={shiftsByDate}
            loading={shiftsLoading}
          />
        </>
      )}
    </div>
  );
}
