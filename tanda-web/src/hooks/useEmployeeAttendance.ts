'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Timestamp,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { formatRecordDate } from '@/lib/attendance/format';
import { COLLECTIONS } from '@/lib/constants';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type EmployeeRecordsRange = 'all' | '7days' | 'month';

interface UseEmployeeAttendanceOptions {
  employeeCode: string;
  displayRange?: EmployeeRecordsRange;
}

function getMonthStartTimestamp(): Timestamp {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(start);
}

function getSevenDaysStartDate(): string {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return toInputDate(start);
}

function getQueryStartTimestamp(): Timestamp {
  return getMonthStartTimestamp();
}

export function useEmployeeAttendance({
  employeeCode,
  displayRange = '7days',
}: UseEmployeeAttendanceOptions) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const initialLoadDoneRef = useRef(false);

  const code = employeeCode.trim();

  const refresh = useCallback(async () => {
    if (!db || !code) {
      setRecords([]);
      setLoading(false);
      setRefreshing(false);
      setError('');
      initialLoadDoneRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError('');

    try {
      const recordsRef = collection(db, COLLECTIONS.ATTENDANCE_RECORDS);
      const recordsQuery =
        displayRange === 'all'
          ? query(recordsRef, where('employeeId', '==', code))
          : query(
              recordsRef,
              where('employeeId', '==', code),
              where('timestampServer', '>=', getQueryStartTimestamp()),
            );

      const snapshot = await getDocs(recordsQuery);
      const mapped = snapshot.docs
        .map((document) => mapAttendanceDoc(document.id, document.data()))
        .sort((a, b) => {
          const aTime = a.timestampServer?.toMillis() ?? 0;
          const bTime = b.timestampServer?.toMillis() ?? 0;
          return bTime - aTime;
        });
      setRecords(mapped);
    } catch (fetchError) {
      console.error('useEmployeeAttendance', fetchError);
      setRecords([]);
      setError('Could not load attendance records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [code, displayRange]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  const displayRecords = useMemo(() => {
    if (displayRange === 'all' || displayRange === 'month') {
      return records;
    }

    const sevenDaysStart = getSevenDaysStartDate();
    return records.filter((record) => {
      const recordDate = formatRecordDate(record.timestampServer);
      return compareInputDates(recordDate, sevenDaysStart) >= 0;
    });
  }, [displayRange, records]);

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
