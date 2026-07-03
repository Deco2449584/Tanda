'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import { toFirestoreRangeBounds } from '@/lib/attendance/date-range';
import { listForgottenCheckIns } from '@/lib/attendance/work-sessions';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import {
  filterTodayShifts,
  listLateArrivalShifts,
  listMissingCheckInShifts,
  listNoShowShifts,
} from '@/lib/dashboard/compute-metrics';
import { COLLECTIONS } from '@/lib/constants';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import { toInputDate } from '@/lib/dates/input-date';
import { db } from '@/lib/firebase';
import {
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_COMPANY_SETTINGS,
  type AttendancePolicySettings,
} from '@/lib/types/company-settings';
import { mapLeaveRequestDoc } from '@/lib/leave-requests/map-leave-request';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';
import { adminAlertRequiresAction } from '@/lib/notifications/admin-alert-metadata';

export interface AdminNotificationItem {
  id: string;
  title: string;
  description: string;
  details: string[];
  href: string;
  count: number;
  requiresAction: boolean;
}

const ATTENDANCE_LOOKBACK_DAYS = 14;
const ATTENDANCE_FETCH_LIMIT = 2000;
const BADGE_POLL_INTERVAL_MS = 60 * 1000;
const MAX_DETAIL_LINES = 4;

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
  attendancePolicy: AttendancePolicySettings;
  timeZone: string;
  employeeNameByCode: Map<string, string>;
}

async function loadAttendancePolicy(): Promise<{
  attendancePolicy: AttendancePolicySettings;
  timeZone: string;
}> {
  if (!db) {
    return {
      attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      timeZone: DEFAULT_COMPANY_SETTINGS.timeZone,
    };
  }

  const snapshot = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'general'));
  if (!snapshot.exists()) {
    return {
      attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
      timeZone: DEFAULT_COMPANY_SETTINGS.timeZone,
    };
  }

  const data = snapshot.data() as Record<string, unknown>;
  const policyRaw = data.attendancePolicy;
  const attendancePolicy: AttendancePolicySettings =
    policyRaw && typeof policyRaw === 'object'
      ? {
          gracePeriodMinutes:
            typeof (policyRaw as Record<string, unknown>).gracePeriodMinutes === 'number'
              ? ((policyRaw as Record<string, unknown>).gracePeriodMinutes as number)
              : DEFAULT_ATTENDANCE_POLICY.gracePeriodMinutes,
          noShowAfterMinutes:
            typeof (policyRaw as Record<string, unknown>).noShowAfterMinutes === 'number'
              ? ((policyRaw as Record<string, unknown>).noShowAfterMinutes as number)
              : DEFAULT_ATTENDANCE_POLICY.noShowAfterMinutes,
        }
      : DEFAULT_ATTENDANCE_POLICY;

  return {
    attendancePolicy,
    timeZone:
      typeof data.timeZone === 'string'
        ? data.timeZone
        : DEFAULT_COMPANY_SETTINGS.timeZone,
  };
}

async function loadEmployeeNameMap(): Promise<Map<string, string>> {
  if (!db) return new Map();

  const snapshot = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
  const map = new Map<string, string>();

  snapshot.docs.forEach((document) => {
    const data = document.data();
    const code = typeof data.employeeId === 'string' ? data.employeeId.trim() : '';
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (code && name) {
      map.set(code, name);
    }
  });

  return map;
}

async function fetchAdminNotificationData(): Promise<AdminNotificationData> {
  if (!db) {
    throw new Error('Firestore is not available.');
  }

  const [{ attendancePolicy, timeZone }, employeeNameByCode] = await Promise.all([
    loadAttendancePolicy(),
    loadEmployeeNameMap(),
  ]);
  const today = toInputDateInTimeZone(timeZone);
  const { start, end } = getRecentAttendanceRange();

  const [leaveSnapshot, shiftsSnapshot, attendanceSnapshot] = await Promise.all([
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
    attendancePolicy,
    timeZone,
    employeeNameByCode,
  };
}

function employeeLabel(employeeId: string, nameByCode: Map<string, string>): string {
  return nameByCode.get(employeeId) ?? `ID ${employeeId}`;
}

function shiftDetailLine(shift: Shift, nameByCode: Map<string, string>): string {
  return `${employeeLabel(shift.employeeId, nameByCode)} · shift ${shift.startTime}–${shift.endTime}`;
}

function summarizeDetailLines(lines: string[]): string[] {
  if (lines.length <= MAX_DETAIL_LINES) return lines;
  const visible = lines.slice(0, MAX_DETAIL_LINES);
  visible.push(`+${lines.length - MAX_DETAIL_LINES} more`);
  return visible;
}

function buildNotificationItems(
  data: AdminNotificationData,
): AdminNotificationItem[] {
  const todayKey = toInputDateInTimeZone(data.timeZone);
  const todayShifts = filterTodayShifts(data.shifts, todayKey);
  const todayStart = Timestamp.fromDate(new Date(`${todayKey}T00:00:00`));
  const todayEnd = Timestamp.fromDate(new Date(`${todayKey}T23:59:59.999`));
  const metricsOptions = {
    policy: data.attendancePolicy,
    timeZone: data.timeZone,
  };

  const todayAttendance = data.attendanceRecords.filter((record) => {
    const ts = record.timestampServer;
    if (!ts) return false;
    return (
      ts.toMillis() >= todayStart.toMillis() &&
      ts.toMillis() <= todayEnd.toMillis()
    );
  });

  const pendingLeaves = data.leaveRequests.filter(
    (request) => request.status === 'Pending',
  );
  const missingShiftList = listMissingCheckInShifts(
    todayShifts,
    todayAttendance,
    metricsOptions,
  );
  const noShowShiftList = listNoShowShifts(
    todayShifts,
    todayAttendance,
    metricsOptions,
  );
  const lateArrivals = listLateArrivalShifts(
    todayShifts,
    todayAttendance,
    metricsOptions,
  );
  const forgottenCheckIns = listForgottenCheckIns(data.attendanceRecords);

  const list: AdminNotificationItem[] = [];

  if (pendingLeaves.length > 0) {
    const details = summarizeDetailLines(
      pendingLeaves.map((request) => {
        const name = employeeLabel(request.employeeId, data.employeeNameByCode);
        return `${name} · ${request.startDate} → ${request.endDate} (${request.type})`;
      }),
    );

    list.push({
      id: 'leave_pending',
      title: 'Pending leave requests',
      description: `${pendingLeaves.length} request${pendingLeaves.length === 1 ? '' : 's'} awaiting approval`,
      details,
      href: '/leave-requests',
      count: pendingLeaves.length,
      requiresAction: adminAlertRequiresAction('leave_pending'),
    });
  }

  if (missingShiftList.length > 0) {
    const details = summarizeDetailLines(
      missingShiftList.map((shift) => shiftDetailLine(shift, data.employeeNameByCode)),
    );

    list.push({
      id: 'missing_checkin',
      title: 'Missing check-ins today',
      description: `${missingShiftList.length} scheduled shift${missingShiftList.length === 1 ? '' : 's'} past grace without check-in`,
      details,
      href: '/schedule?alert=missing_checkin',
      count: missingShiftList.length,
      requiresAction: adminAlertRequiresAction('missing_checkin'),
    });
  }

  if (noShowShiftList.length > 0) {
    const details = summarizeDetailLines(
      noShowShiftList.map((shift) => shiftDetailLine(shift, data.employeeNameByCode)),
    );

    list.push({
      id: 'no_show_today',
      title: 'No-shows today',
      description: `${noShowShiftList.length} employee${noShowShiftList.length === 1 ? '' : 's'} did not check in within the no-show window`,
      details,
      href: '/schedule?alert=no_show',
      count: noShowShiftList.length,
      requiresAction: adminAlertRequiresAction('no_show_today'),
    });
  }

  if (lateArrivals.length > 0) {
    const details = summarizeDetailLines(
      lateArrivals.map(({ shift, checkIn }) => {
        const name = employeeLabel(shift.employeeId, data.employeeNameByCode);
        const time = formatRecordTime(checkIn.timestampServer);
        return `${name} · shift ${shift.startTime}, checked in ${time}`;
      }),
    );

    list.push({
      id: 'late_today',
      title: 'Late arrivals today',
      description: `${lateArrivals.length} employee${lateArrivals.length === 1 ? '' : 's'} checked in after the grace period`,
      details,
      href: `/attendance?range=today&date=${todayKey}`,
      count: lateArrivals.length,
      requiresAction: adminAlertRequiresAction('late_today'),
    });
  }

  if (forgottenCheckIns.length > 0) {
    const details = summarizeDetailLines(
      forgottenCheckIns.map((checkIn) => {
        const name =
          checkIn.employeeNameSnapshot ||
          employeeLabel(checkIn.employeeId, data.employeeNameByCode);
        const date = formatRecordDate(checkIn.timestampServer);
        const time = formatRecordTime(checkIn.timestampServer);
        return `${name} · check-in ${date} ${time}`;
      }),
    );

    list.push({
      id: 'forgotten_checkout',
      title: 'Forgotten check-outs',
      description: `${forgottenCheckIns.length} open check-in${forgottenCheckIns.length === 1 ? '' : 's'} need a manual check-out`,
      details,
      href: '/attendance?filter=forgotten',
      count: forgottenCheckIns.length,
      requiresAction: adminAlertRequiresAction('forgotten_checkout'),
    });
  }

  return list;
}

export function useAdminNotifications(enabled: boolean) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(
    [],
  );
  const [attendancePolicy, setAttendancePolicy] = useState<AttendancePolicySettings>(
    DEFAULT_ATTENDANCE_POLICY,
  );
  const [timeZone, setTimeZone] = useState(DEFAULT_COMPANY_SETTINGS.timeZone);
  const [employeeNameByCode, setEmployeeNameByCode] = useState<Map<string, string>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!enabled || !db) {
      setLeaveRequests([]);
      setShifts([]);
      setAttendanceRecords([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await fetchAdminNotificationData();
      setLeaveRequests(data.leaveRequests);
      setShifts(data.shifts);
      setAttendanceRecords(data.attendanceRecords);
      setAttendancePolicy(data.attendancePolicy);
      setTimeZone(data.timeZone);
      setEmployeeNameByCode(data.employeeNameByCode);
    } catch (error) {
      console.error('useAdminNotifications', error);
      setLeaveRequests([]);
      setShifts([]);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !db) {
      setLeaveRequests([]);
      setShifts([]);
      setAttendanceRecords([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      await loadData();
      if (cancelled) return;
    })();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void loadData({ silent: true });
    }, BADGE_POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadData({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled, loadData]);

  const items = useMemo<AdminNotificationItem[]>(() => {
    if (!enabled) return [];

    return buildNotificationItems({
      leaveRequests,
      shifts,
      attendanceRecords,
      attendancePolicy,
      timeZone,
      employeeNameByCode,
    });
  }, [
    attendancePolicy,
    attendanceRecords,
    employeeNameByCode,
    enabled,
    leaveRequests,
    shifts,
    timeZone,
  ]);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.count, 0),
    [items],
  );

  return { items, totalCount, loading, refreshing, timeZone, refresh: loadData };
}
