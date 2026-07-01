'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Timestamp,
  collection,
  getDocs,
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
  const [refreshing, setRefreshing] = useState(false);
  const initialLoadDoneRef = useRef(false);

  const week = useMemo(() => buildWeekRange(new Date()), []);

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

    const { start, end } = getTodayTimestampBounds();

    try {
      const [shiftsSnapshot, leaveSnapshot, attendanceSnapshot] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTIONS.SHIFTS),
            where('date', '>=', week.start),
            where('date', '<=', week.end),
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
            where('timestampServer', '>=', start),
            where('timestampServer', '<=', end),
            orderBy('timestampServer', 'asc'),
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
      setTodayAttendance(
        attendanceSnapshot.docs.map((document) =>
          mapAttendanceDoc(document.id, document.data()),
        ),
      );
    } catch (error) {
      console.error('useAdminDashboardData', error);
    } finally {
      setLoading({ shifts: false, leaveRequests: false, attendance: false });
      setRefreshing(false);
      initialLoadDoneRef.current = true;
    }
  }, [week.end, week.start]);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    void refresh();
  }, [refresh]);

  const todayShifts = useMemo(
    () => filterTodayShifts(shifts, settings.timeZone),
    [settings.timeZone, shifts],
  );

  const lateAlerts = useMemo(
    () =>
      computeLateAlerts(todayShifts, todayAttendance, {
        policy: settings.attendancePolicy,
        timeZone: settings.timeZone,
      }),
    [settings.attendancePolicy, settings.timeZone, todayAttendance, todayShifts],
  );

  const pendingLeaveCount = useMemo(
    () => countPendingLeaveRequests(leaveRequests),
    [leaveRequests],
  );

  const weeklyHours: WeeklyHoursDatum[] = useMemo(
    () => buildWeeklyHoursData(shifts, week.days),
    [shifts, week.days],
  );

  const shiftLoadByDepartment: ShiftLoadDatum[] = useMemo(
    () => buildShiftLoadByDepartment(shifts),
    [shifts],
  );

  return {
    week,
    shifts,
    leaveRequests,
    todayAttendance,
    todayShifts,
    lateAlerts,
    pendingLeaveCount,
    weeklyHours,
    shiftLoadByDepartment,
    loading,
    refreshing,
    refresh,
  };
}
