'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  buildShiftLoadByDepartment,
  buildWeeklyHoursData,
  computeLateAlerts,
  countPendingLeaveRequests,
  filterTodayShifts,
  filterWeekShifts,
} from '@/lib/dashboard/compute-metrics';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { buildWeekRange } from '@/lib/schedule/week';
import { db } from '@/lib/firebase';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';
import type { ShiftLoadDatum, WeeklyHoursDatum } from '@/lib/dashboard/types';

function getTodayTimestampBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

export function useAdminDashboardData() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState({
    shifts: true,
    leaveRequests: true,
    attendance: true,
  });

  const week = useMemo(() => buildWeekRange(new Date()), []);

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

    const unsubscribeShifts = onSnapshot(
      collection(db, COLLECTIONS.SHIFTS),
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
        console.error('useAdminDashboardData shifts', error);
        shiftsReady = true;
        updateLoading();
      },
    );

    const unsubscribeLeave = onSnapshot(
      collection(db, COLLECTIONS.LEAVE_REQUESTS),
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
        console.error('useAdminDashboardData leaveRequests', error);
        leaveReady = true;
        updateLoading();
      },
    );

    const { start, end } = getTodayTimestampBounds();
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
    );

    const unsubscribeAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setTodayAttendance(
          snapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        );
        attendanceReady = true;
        updateLoading();
      },
      (error) => {
        console.error('useAdminDashboardData attendance', error);
        attendanceReady = true;
        updateLoading();
      },
    );

    return () => {
      unsubscribeShifts();
      unsubscribeLeave();
      unsubscribeAttendance();
    };
  }, []);

  const todayShifts = useMemo(() => filterTodayShifts(shifts), [shifts]);
  const weekShifts = useMemo(
    () => filterWeekShifts(shifts, week.start, week.end),
    [shifts, week.end, week.start],
  );

  const pendingPermits = useMemo(
    () => countPendingLeaveRequests(leaveRequests),
    [leaveRequests],
  );

  const lateAlerts = useMemo(
    () => computeLateAlerts(todayShifts, todayAttendance),
    [todayAttendance, todayShifts],
  );

  const shiftLoadData = useMemo<ShiftLoadDatum[]>(
    () => buildShiftLoadByDepartment(todayShifts),
    [todayShifts],
  );

  const weeklyHoursData = useMemo<WeeklyHoursDatum[]>(
    () => buildWeeklyHoursData(weekShifts, week.days),
    [week.days, weekShifts],
  );

  return {
    pendingPermits,
    lateAlerts,
    shiftLoadData,
    weeklyHoursData,
    loading,
  };
}
