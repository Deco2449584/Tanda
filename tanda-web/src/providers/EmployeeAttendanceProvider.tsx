'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';

export interface EmployeeAttendanceContextValue {
  records: AttendanceRecord[];
  loading: boolean;
  refreshing: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const EmployeeAttendanceContext =
  createContext<EmployeeAttendanceContextValue | null>(null);

async function fetchEmployeeAttendance(
  employeeCode: string,
): Promise<AttendanceRecord[]> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('employeeId', '==', employeeCode),
    ),
  );

  return snapshot.docs
    .map((document) => mapAttendanceDoc(document.id, document.data()))
    .sort((a, b) => {
      const aTime = a.timestampServer?.toMillis() ?? 0;
      const bTime = b.timestampServer?.toMillis() ?? 0;
      return bTime - aTime;
    });
}

export function EmployeeAttendanceProvider({
  employeeCode,
  children,
}: {
  employeeCode: string;
  children: ReactNode;
}) {
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
      setRecords(await fetchEmployeeAttendance(code));
    } catch (fetchError) {
      console.error('EmployeeAttendanceProvider', fetchError);
      setRecords([]);
      setError('Could not load attendance records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [code]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ records, loading, refreshing, error, refresh }),
    [records, loading, refreshing, error, refresh],
  );

  return (
    <EmployeeAttendanceContext.Provider value={value}>
      {children}
    </EmployeeAttendanceContext.Provider>
  );
}

export function useEmployeeAttendanceContext(): EmployeeAttendanceContextValue {
  const context = useContext(EmployeeAttendanceContext);
  if (!context) {
    throw new Error(
      'useEmployeeAttendance must be used within EmployeeAttendanceProvider',
    );
  }
  return context;
}
