'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  getDocs,
  limit,
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
import { toInputDate } from '@/lib/dates/input-date';
import { auth, db } from '@/lib/firebase';
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

const ATTENDANCE_LOOKBACK_DAYS = 14;
const ATTENDANCE_FETCH_LIMIT = 2000;
const BADGE_POLL_INTERVAL_MS = 5 * 60 * 1000;

function getRecentAttendanceRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - ATTENDANCE_LOOKBACK_DAYS);

  return toFirestoreRangeBounds({
    start: toInputDate(start),
    end: toInputDate(end),
  });
}

interface AdminNotificationData {
  leaveRequests: LeaveRequest[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  pendingKioskDevices: number;
}

async function fetchPendingKioskDeviceCount(): Promise<number> {
  const user = auth?.currentUser;
  if (!user) return 0;

  const token = await user.getIdToken();
  const response = await fetch('/api/kiosk/devices/pending-count', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return 0;

  const data = (await response.json()) as { pendingCount?: number };
  return typeof data.pendingCount === 'number' ? data.pendingCount : 0;
}

async function fetchAdminNotificationData(): Promise<AdminNotificationData> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const today = toInputDate();
  const { start, end } = getRecentAttendanceRange();

  const [leaveSnapshot, shiftsSnapshot, attendanceSnapshot, pendingKioskDevices] =
    await Promise.all([
    getDocs(
      query(
        collection(db, COLLECTIONS.LEAVE_REQUESTS),
        where('status', '==', 'Pending'),
      ),
    ),
    getDocs(
      query(collection(db, COLLECTIONS.SHIFTS), where('date', '==', today)),
    ),
    getDocs(
      query(
        collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
        where('timestampServer', '>=', start),
        where('timestampServer', '<=', end),
        orderBy('timestampServer', 'desc'),
        limit(ATTENDANCE_FETCH_LIMIT),
      ),
    ),
    fetchPendingKioskDeviceCount(),
  ]);

  return {
    leaveRequests: leaveSnapshot.docs.map((document) =>
      mapLeaveRequestDoc(document.id, document.data()),
    ),
    shifts: shiftsSnapshot.docs.map((document) =>
      mapShiftDoc(document.id, document.data()),
    ),
    attendanceRecords: attendanceSnapshot.docs.map((document) =>
      mapAttendanceDoc(document.id, document.data()),
    ),
    pendingKioskDevices,
  };
}

function buildNotificationItems(
  data: AdminNotificationData,
): AdminNotificationItem[] {
  const todayShifts = filterTodayShifts(data.shifts);
  const today = new Date();
  const todayKey = toInputDate(today);
  const todayStart = Timestamp.fromDate(new Date(`${todayKey}T00:00:00`));
  const todayEnd = Timestamp.fromDate(new Date(`${todayKey}T23:59:59.999`));

  const todayAttendance = data.attendanceRecords.filter((record) => {
    const ts = record.timestampServer;
    if (!ts) return false;
    return (
      ts.toMillis() >= todayStart.toMillis() &&
      ts.toMillis() <= todayEnd.toMillis()
    );
  });

  const pendingLeaves = countPendingLeaveRequests(data.leaveRequests);
  const lateToday = computeLateAlerts(todayShifts, todayAttendance);
  const missingCheckIns = computeMissingCheckInsToday(
    todayShifts,
    todayAttendance,
  );
  const forgottenCheckouts = countForgottenCheckIns(data.attendanceRecords);

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

  if (data.pendingKioskDevices > 0) {
    list.push({
      id: 'kiosk_pending',
      title: 'Kiosk devices pending',
      description: `${data.pendingKioskDevices} tablet${data.pendingKioskDevices === 1 ? '' : 's'} waiting for approval`,
      href: '/settings',
      count: data.pendingKioskDevices,
    });
  }

  return list;
}

function countNotificationItems(data: AdminNotificationData): number {
  return buildNotificationItems(data).reduce((sum, item) => sum + item.count, 0);
}

export function useAdminNotifications(enabled: boolean) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [pendingKioskDevices, setPendingKioskDevices] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !db) {
      setLeaveRequests([]);
      setShifts([]);
      setAttendanceRecords([]);
      setPendingKioskDevices(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchAdminNotificationData()
      .then((data) => {
        if (cancelled) return;
        setLeaveRequests(data.leaveRequests);
        setShifts(data.shifts);
        setAttendanceRecords(data.attendanceRecords);
        setPendingKioskDevices(data.pendingKioskDevices);
      })
      .catch((error) => {
        console.error('useAdminNotifications', error);
        if (cancelled) return;
        setLeaveRequests([]);
        setShifts([]);
        setAttendanceRecords([]);
        setPendingKioskDevices(0);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const items = useMemo<AdminNotificationItem[]>(() => {
    if (!enabled) return [];

    return buildNotificationItems({
      leaveRequests,
      shifts,
      attendanceRecords,
      pendingKioskDevices,
    });
  }, [attendanceRecords, enabled, leaveRequests, pendingKioskDevices, shifts]);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items],
  );

  return { items, totalCount, loading };
}

export function useAdminNotificationBadge(enabled: boolean) {
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!enabled || !db) {
      setTotalCount(0);
      return;
    }

    let cancelled = false;

    async function pollBadge() {
      try {
        const data = await fetchAdminNotificationData();
        if (!cancelled) {
          setTotalCount(countNotificationItems(data));
        }
      } catch (error) {
        console.error('useAdminNotificationBadge', error);
      }
    }

    void pollBadge();
    const intervalId = window.setInterval(() => {
      void pollBadge();
    }, BADGE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return totalCount;
}
