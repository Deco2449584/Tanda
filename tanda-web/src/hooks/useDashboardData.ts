'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import type { DateRange } from '@/lib/attendance/date-range';
import { toFirestoreRangeBounds } from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';

export function useDashboardData(dateRange: DateRange) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState({
    shifts: true,
    leaveRequests: true,
    attendance: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!db) {
      setLoading({ shifts: false, leaveRequests: false, attendance: false });
      setRefreshing(false);
      return;
    }

    if (!initialLoadDoneRef.current) {
      setLoading({ shifts: true, leaveRequests: true, attendance: true });
    } else {
      setRefreshing(true);
    }

    try {
      const bounds = toFirestoreRangeBounds(dateRange);
      const [shiftsSnapshot, leaveSnapshot, attendanceSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.SHIFTS),
            where('date', '>=', dateRange.start),
            where('date', '<=', dateRange.end),
            orderBy('date', 'asc'),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.LEAVE_REQUESTS),
            where('status', '==', 'Pending'),
          ),
        ),
        getDocs(
          query(
            collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
            where('timestampServer', '>=', bounds.start),
            where('timestampServer', '<=', bounds.end),
            orderBy('timestampServer', 'desc'),
            limit(5000),
          ),
        ),
      ]);

      setShifts(
        shiftsSnapshot.docs.map((document) =>
          mapShiftDoc(document.id, document.data()),
        ),
      );
      setLeaveRequests(
        leaveSnapshot.docs.map((document) =>
          mapLeaveRequestDoc(document.id, document.data()),
        ),
      );
      setAttendance(
        attendanceSnapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        ),
      );
    } catch (error) {
      console.error('useDashboardData', error);
    } finally {
      setLoading({ shifts: false, leaveRequests: false, attendance: false });
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  return {
    shifts,
    leaveRequests,
    attendance,
    loading,
    refreshing,
    refresh,
  };
}
