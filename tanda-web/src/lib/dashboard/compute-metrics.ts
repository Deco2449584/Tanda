import type { Timestamp } from 'firebase/firestore';
import { getMinutesInTimeZone, timestampToMinutesInTimeZone } from '@/lib/dates/timezone';
import { normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import {
  isCheckInLate,
  isMissingCheckIn,
  isNoShow,
  timeToMinutes,
} from '@/lib/attendance/evaluate-shift-attendance';
import type { WeekDay } from '@/lib/schedule/week';
import type { AttendanceRecord } from '@/lib/types/attendance';
import {
  DEFAULT_ATTENDANCE_POLICY,
  type AttendancePolicySettings,
} from '@/lib/types/company-settings';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';
import type { ShiftLoadDatum, WeeklyHoursDatum } from './types';

export interface AttendanceMetricsOptions {
  policy?: AttendancePolicySettings;
  timeZone?: string;
  now?: Date;
}

function resolveMetricsOptions(options?: AttendanceMetricsOptions) {
  return {
    policy: options?.policy ?? DEFAULT_ATTENDANCE_POLICY,
    timeZone: options?.timeZone ?? 'Australia/Sydney',
    now: options?.now ?? new Date(),
  };
}

export function shiftDurationHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return (end - start) / 60;
}

export function filterTodayShifts(
  shifts: Shift[],
  todayKey: string = toInputDate(),
): Shift[] {
  return shifts.filter(
    (shift) => normalizeInputDate(shift.date) === todayKey,
  );
}

export function filterWeekShifts(
  shifts: Shift[],
  weekStart: string,
  weekEnd: string,
): Shift[] {
  return shifts.filter((shift) => {
    const date = normalizeInputDate(shift.date);
    return date >= weekStart && date <= weekEnd;
  });
}

export function countPendingLeaveRequests(requests: LeaveRequest[]): number {
  return requests.filter((request) => request.status === 'Pending').length;
}

function buildEarliestCheckInMap(
  todayCheckIns: AttendanceRecord[],
): Map<string, AttendanceRecord> {
  const checkInByEmployee = new Map<string, AttendanceRecord>();

  todayCheckIns.forEach((record) => {
    if (record.type !== 'check_in' || !record.timestampServer) return;

    const existing = checkInByEmployee.get(record.employeeId);
    if (!existing?.timestampServer) {
      checkInByEmployee.set(record.employeeId, record);
      return;
    }

    if (
      record.timestampServer.toMillis() <
      existing.timestampServer.toMillis()
    ) {
      checkInByEmployee.set(record.employeeId, record);
    }
  });

  return checkInByEmployee;
}

export function computeLateAlerts(
  todayShifts: Shift[],
  todayCheckIns: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): number {
  const { policy, timeZone } = resolveMetricsOptions(options);
  const checkInByEmployee = buildEarliestCheckInMap(todayCheckIns);

  let lateCount = 0;

  todayShifts.forEach((shift) => {
    const checkIn = checkInByEmployee.get(shift.employeeId);
    if (!checkIn?.timestampServer) return;

    const shiftStart = timeToMinutes(shift.startTime);
    const checkInTime = timestampToMinutesInTimeZone(checkIn.timestampServer, timeZone);

    if (isCheckInLate(checkInTime, shiftStart, policy)) {
      lateCount += 1;
    }
  });

  return lateCount;
}

export function computeMissingCheckInsToday(
  todayShifts: Shift[],
  todayRecords: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): number {
  const { policy, timeZone, now } = resolveMetricsOptions(options);
  const nowMinutes = getMinutesInTimeZone(timeZone, now);

  const checkedInToday = new Set(
    todayRecords
      .filter((record) => record.type === 'check_in')
      .map((record) => record.employeeId),
  );

  return todayShifts.filter((shift) => {
    const hasCheckIn = checkedInToday.has(shift.employeeId);
    return isMissingCheckIn(
      timeToMinutes(shift.startTime),
      nowMinutes,
      hasCheckIn,
      policy,
    );
  }).length;
}

export function computeNoShowsToday(
  todayShifts: Shift[],
  todayRecords: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): number {
  const { policy, timeZone, now } = resolveMetricsOptions(options);
  const nowMinutes = getMinutesInTimeZone(timeZone, now);

  const checkedInToday = new Set(
    todayRecords
      .filter((record) => record.type === 'check_in')
      .map((record) => record.employeeId),
  );

  return todayShifts.filter((shift) => {
    const hasCheckIn = checkedInToday.has(shift.employeeId);
    return isNoShow(
      timeToMinutes(shift.startTime),
      nowMinutes,
      hasCheckIn,
      policy,
    );
  }).length;
}

export function buildShiftLoadByDepartment(todayShifts: Shift[]): ShiftLoadDatum[] {
  const counts = new Map<string, number>();

  todayShifts.forEach((shift) => {
    const department = shift.department.trim() || 'No department';
    counts.set(department, (counts.get(department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([department, turnos]) => ({ department, turnos }))
    .sort((a, b) => b.turnos - a.turnos);
}

export function buildWeeklyHoursData(
  weekShifts: Shift[],
  weekDays: WeekDay[],
): WeeklyHoursDatum[] {
  return weekDays.map((day) => {
    const dayShifts = weekShifts.filter(
      (shift) => normalizeInputDate(shift.date) === day.date,
    );
    const horas = dayShifts.reduce(
      (sum, shift) => sum + shiftDurationHours(shift.startTime, shift.endTime),
      0,
    );

    return {
      day: day.label,
      horas: Math.round(horas * 10) / 10,
    };
  });
}

/** @deprecated internal helper export for tests */
export function timestampToMinutes(timestamp: Timestamp): number {
  const date = timestamp.toDate();
  return date.getHours() * 60 + date.getMinutes();
}
