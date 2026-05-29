'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface UseEmployeeAttendanceOptions {
  /** Código corto del empleado (ej. '0002'), NO el doc.id de Firestore. */
  employeeCode: string;
  limit?: number;
}

export function useEmployeeAttendance({
  employeeCode,
  limit = 4,
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

    const recordsQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('employeeId', '==', code),
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
          })
          .slice(0, limit);
        setRecords(mapped);
        setLoading(false);
        setError('');
      },
      (snapshotError) => {
        console.error('useEmployeeAttendance', snapshotError);
        setRecords([]);
        setLoading(false);
        setError('No se pudieron cargar los registros de asistencia.');
      },
    );

    return () => unsubscribe();
  }, [code, limit]);

  return useMemo(
    () => ({ records, loading, error }),
    [records, loading, error],
  );
}
