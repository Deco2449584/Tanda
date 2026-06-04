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
import { toFirestoreRangeBounds } from '@/lib/attendance/date-range';
import { countForgottenCheckIns } from '@/lib/attendance/work-sessions';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import {
  computeLateAlerts,
  computeMissingCheckInsToday,
  countPendingLeaveRequests,
  filterTodayShifts,
} from '@/lib/dashboard/compute-metrics';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';

export interface AdminNotificationItem {
  id: string;
  title: string;
  description: string;
  href: string;
  count: number;
}

function getRecentAttendanceRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);

  const toInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return toFirestoreRangeBounds({
    start: toInput(start),
    end: toInput(end),
  });
}

export function useAdminNotifications(enabled: boolean) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !db) {
      setLeaveRequests([]);
      setShifts([]);
      setAttendanceRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    let leaveReady = false;
    let shiftsReady = false;
    let attendanceReady = false;

    function checkReady() {
      if (leaveReady && shiftsReady && attendanceReady) {
        setLoading(false);
      }
    }

    const unsubscribeLeave = onSnapshot(
      query(collection(db, COLLECTIONS.LEAVE_REQUESTS), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setLeaveRequests(
          snapshot.docs.map((document) =>
            mapLeaveRequestDoc(document.id, document.data()),
          ),
        );
        leaveReady = true;
        checkReady();
      },
      () => {
        leaveReady = true;
        checkReady();
      },
    );

    const unsubscribeShifts = onSnapshot(
      collection(db, COLLECTIONS.SHIFTS),
      (snapshot) => {
        setShifts(
          snapshot.docs.map((document) =>
            mapShiftDoc(document.id, document.data()),
          ),
        );
        shiftsReady = true;
        checkReady();
      },
      () => {
        shiftsReady = true;
        checkReady();
      },
    );

    const { start, end } = getRecentAttendanceRange();
    const attendanceQuery = query(
      collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
      where('timestampServer', '>=', start),
      where('timestampServer', '<=', end),
      orderBy('timestampServer', 'desc'),
    );

    const unsubscribeAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setAttendanceRecords(
          snapshot.docs.map((document) =>
            mapAttendanceDoc(document.id, document.data()),
          ),
        );
        attendanceReady = true;
        checkReady();
      },
      () => {
        attendanceReady = true;
        checkReady();
      },
    );

    return () => {
      unsubscribeLeave();
      unsubscribeShifts();
      unsubscribeAttendance();
    };
  }, [enabled]);

  const items = useMemo<AdminNotificationItem[]>(() => {
    if (!enabled) return [];

    const todayShifts = filterTodayShifts(shifts);
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayStart = Timestamp.fromDate(new Date(`${todayKey}T00:00:00`));
    const todayEnd = Timestamp.fromDate(new Date(`${todayKey}T23:59:59.999`));

    const todayAttendance = attendanceRecords.filter((record) => {
      const ts = record.timestampServer;
      if (!ts) return false;
      return ts.toMillis() >= todayStart.toMillis() && ts.toMillis() <= todayEnd.toMillis();
    });

    const pendingLeaves = countPendingLeaveRequests(leaveRequests);
    const lateToday = computeLateAlerts(todayShifts, todayAttendance);
    const missingCheckIns = computeMissingCheckInsToday(
      todayShifts,
      todayAttendance,
    );
    const forgottenCheckouts = countForgottenCheckIns(attendanceRecords);

    const list: AdminNotificationItem[] = [];

    if (pendingLeaves > 0) {
      list.push({
        id: 'leave_pending',
        title: 'Pending leave requests',
        description: `${pendingLeaves} request${pendingLeaves === 1 ? '' : 's'} awaiting approval`,
        href: '/leave-requests',
        count: pendingLeaves,
      });
    }

    if (missingCheckIns > 0) {
      list.push({
        id: 'missing_checkin',
        title: 'Missing check-ins today',
        description: `${missingCheckIns} scheduled shift${missingCheckIns === 1 ? '' : 's'} without check-in`,
        href: '/attendance',
        count: missingCheckIns,
      });
    }

    if (lateToday > 0) {
      list.push({
        id: 'late_today',
        title: 'Late arrivals today',
        description: `${lateToday} employee${lateToday === 1 ? '' : 's'} checked in after start time`,
        href: '/attendance',
        count: lateToday,
      });
    }

    if (forgottenCheckouts > 0) {
      list.push({
        id: 'forgotten_checkout',
        title: 'Forgotten check-outs',
        description: `${forgottenCheckouts} open check-in${forgottenCheckouts === 1 ? '' : 's'} need a manual check-out`,
        href: '/attendance',
        count: forgottenCheckouts,
      });
    }

    return list;
  }, [attendanceRecords, enabled, leaveRequests, shifts]);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items],
  );

  return { items, totalCount, loading };
}
