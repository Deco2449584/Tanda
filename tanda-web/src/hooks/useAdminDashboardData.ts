'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  buildShiftLoadByDepartment,
  buildWeeklyHoursData,
  computeLateAlerts,
  countPendingLeaveRequests,
  filterTodayShifts,
} from '@/lib/dashboard/compute-metrics';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { COLLECTIONS } from '@/lib/constants';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { buildWeekRange } from '@/lib/schedule/week';
import { db } from '@/lib/firebase';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
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
  const { settings } = useCompanySettings();
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

    const shiftsQuery = query(
      collection(db, COLLECTIONS.SHIFTS),
      where('date', '>=', week.start),
      where('date', '<=', week.end),
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
        console.error('useAdminDashboardData shifts', error);
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
  }, [week.end, week.start]);

  const todayShifts = useMemo(() => filterTodayShifts(shifts), [shifts]);

  const pendingPermits = useMemo(
    () => countPendingLeaveRequests(leaveRequests),
    [leaveRequests],
  );

  const lateAlerts = useMemo(
    () =>
      computeLateAlerts(todayShifts, todayAttendance, {
        policy: settings.attendancePolicy,
        timeZone: settings.timeZone,
      }),
    [settings.attendancePolicy, settings.timeZone, todayAttendance, todayShifts],
  );

  const shiftLoadData = useMemo<ShiftLoadDatum[]>(
    () => buildShiftLoadByDepartment(todayShifts),
    [todayShifts],
  );

  const weeklyHoursData = useMemo<WeeklyHoursDatum[]>(
    () => buildWeeklyHoursData(shifts, week.days),
    [shifts, week.days],
  );

  return {
    pendingPermits,
    lateAlerts,
    shiftLoadData,
    weeklyHoursData,
    todayShifts,
    todayAttendance,
    loading,
  };
}
