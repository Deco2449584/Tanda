'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { fetchPeriodLockRequest } from '@/lib/accounting/accounting-api';
import type { AccountingPeriodLock } from '@/lib/accounting/period-lock';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { toFirestoreRangeBounds, type DateRange } from '@/lib/attendance/date-range';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';

export function useAccountingPeriod(
  dateRange: DateRange,
  attendanceBreak: AttendanceBreakSettings,
) {
  const [sessions, setSessions] = useState<ReturnType<typeof buildWorkSessionsFromRecords>>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [lock, setLock] = useState<AccountingPeriodLock | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPeriod = useCallback(async () => {
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { start, end } = toFirestoreRangeBounds(dateRange);
    try {
      const [attendanceSnapshot, shiftsSnapshot, leaveSnapshot, periodLock] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
            where('timestampServer', '>=', start),
            where('timestampServer', '<=', end),
            orderBy('timestampServer', 'desc'),
            limit(5000),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.SHIFTS),
            where('date', '>=', dateRange.start),
            where('date', '<=', dateRange.end),
          ),
        ),
        getDocs(query(collection(db, COLLECTIONS.LEAVE_REQUESTS), orderBy('createdAt', 'desc'))),
        fetchPeriodLockRequest({ start: dateRange.start, end: dateRange.end }).catch(() => null),
      ]);
      const records = attendanceSnapshot.docs.map((doc) => mapAttendanceDoc(doc.id, doc.data()));
      setSessions(buildWorkSessionsFromRecords(records, attendanceBreak));
      setShifts(shiftsSnapshot.docs.map((doc) => mapShiftDoc(doc.id, doc.data())));
      setLeaveRequests(
        leaveSnapshot.docs.map((doc) => mapLeaveRequestDoc(doc.id, doc.data())),
      );
      setLock(periodLock);
    } finally {
      setLoading(false);
    }
  }, [dateRange, attendanceBreak]);

  useEffect(() => {
    void loadPeriod();
  }, [loadPeriod]);

  return { sessions, shifts, leaveRequests, lock, setLock, loading, reload: loadPeriod };
}
