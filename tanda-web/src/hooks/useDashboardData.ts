'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
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

  useEffect(() => {
    if (!db) {
      setLoading({ shifts: false, leaveRequests: false, attendance: false });
      return;
    }

    let shiftsReady = false;
    let leaveReady = false;
    let attendanceReady = false;

    function updateLoading() {
      if (shiftsReady && leaveReady && attendanceReady) {
        setLoading({ shifts: false, leaveRequests: false, attendance: false });
      }
    }

    const shiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('date', '>=', dateRange.start),
      where('date', '<=', dateRange.end),
      orderBy('date', 'asc'),
    );

    const unsubscribeShifts = onSnapshot(
      shiftsQuery,
      (snapshot) => {
        setShifts(
          snapshot.docs.map((document) =>
            mapShiftDoc(document.id, document.data()),
          ),
        );
        shiftsReady = true;
        updateLoading();
      },
      (error) => {
        console.error('useDashboardData shifts', error);
        shiftsReady = true;
        updateLoading();
      },
    );

    const leaveQuery = query(
      collection(db, COLLECTIONS.LEAVE_REQUESTS),
      where('status', '==', 'Pending'),
    );

    const unsubscribeLeave = onSnapshot(
      leaveQuery,
      (snapshot) => {
        setLeaveRequests(
          snapshot.docs.map((document) =>
            mapLeaveRequestDoc(document.id, document.data()),
          ),
        );
        leaveReady = true;
        updateLoading();
      },
      (error) => {
        console.error('useDashboardData leaveRequests', error);
        leaveReady = true;
        updateLoading();
      },
    );

    const { start, end } = toFirestoreRangeBounds(dateRange);
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
      limit(5000),
    );

    const unsubscribeAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setAttendance(
          snapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        );
        attendanceReady = true;
        updateLoading();
      },
      (error) => {
        console.error('useDashboardData attendance', error);
        attendanceReady = true;
        updateLoading();
      },
    );

    return () => {
      unsubscribeShifts();
      unsubscribeLeave();
      unsubscribeAttendance();
    };
  }, [dateRange.end, dateRange.start]);

  return {
    shifts,
    leaveRequests,
    attendance,
    loading,
  };
}
