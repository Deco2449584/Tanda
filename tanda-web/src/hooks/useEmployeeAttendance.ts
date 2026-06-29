'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  onSnapshot,
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
  /** Código corto del empleado (ej. '0002'), NO el doc.id de Firestore. */
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

function getQueryStartTimestamp(displayRange: Exclude<EmployeeRecordsRange, 'all'>): Timestamp {
  return getMonthStartTimestamp();
}

export function useEmployeeAttendance({
  employeeCode,
  displayRange = '7days',
}: UseEmployeeAttendanceOptions) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const code = employeeCode.trim();

  useEffect(() => {
    if (!db || !code) {
      setRecords([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    const recordsRef = collection(db, COLLECTIONS.ATTENDANCE_RECORDS);
    const recordsQuery =
      displayRange === 'all'
        ? query(recordsRef, where('employeeId', '==', code))
        : query(
            recordsRef,
            where('employeeId', '==', code),
            where('timestampServer', '>=', getQueryStartTimestamp(displayRange)),
          );

    const unsubscribe = onSnapshot(
      recordsQuery,
      (snapshot) => {
        const mapped = snapshot.docs
          .map((document) => mapAttendanceDoc(document.id, document.data()))
          .sort((a, b) => {
            const aTime = a.timestampServer?.toMillis() ?? 0;
            const bTime = b.timestampServer?.toMillis() ?? 0;
            return bTime - aTime;
          });
        setRecords(mapped);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('useEmployeeAttendance', snapshotError);
        setRecords([]);
        setLoading(false);
        setError('Could not load attendance records.');
      },
    );

    return () => unsubscribe();
  }, [code, displayRange]);

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
    () => ({ records: displayRecords, allRecords: records, loading, error }),
    [displayRecords, records, loading, error],
  );
}
