'use client';

import { useMemo } from 'react';
import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import { useEmployeeAttendanceContext } from '@/providers/EmployeeAttendanceProvider';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type EmployeeRecordsRange = 'all' | '7days' | 'month';

interface UseEmployeeAttendanceOptions {
  employeeCode?: string;
  displayRange?: EmployeeRecordsRange;
}

function getSevenDaysStartDate(): string {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return toInputDate(start);
}

function getMonthStartDate(): string {
  const now = new Date();
  return toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function filterRecordsByRange(
  records: AttendanceRecord[],
  displayRange: EmployeeRecordsRange,
): AttendanceRecord[] {
  if (displayRange === 'all') {
    return records;
  }

  const startDate =
    displayRange === 'month' ? getMonthStartDate() : getSevenDaysStartDate();

  return records.filter((record) => {
    const recordDate = formatRecordDate(record.timestampServer);
    return compareInputDates(recordDate, startDate) >= 0;
  });
}

export function useEmployeeAttendance({
  displayRange = '7days',
}: UseEmployeeAttendanceOptions = {}) {
  const { records, loading, refreshing, error, refresh } =
    useEmployeeAttendanceContext();

  const displayRecords = useMemo(
    () => filterRecordsByRange(records, displayRange),
    [displayRange, records],
  );

  return useMemo(
    () => ({
      records: displayRecords,
      allRecords: records,
      loading,
      refreshing,
      error,
      refresh,
    }),
    [displayRecords, records, loading, refreshing, error, refresh],
  );
}
