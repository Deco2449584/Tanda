import type { Timestamp } from 'firebase/firestore';
import { formatRecordDate } from '@/lib/attendance/format';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { getMinutesInTimeZone, timestampToMinutesInTimeZone } from '@/lib/dates/timezone';
import { normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import {
  isCheckInLate,
  isMissingCheckIn,
  isNoShow,
  timeToMinutes,
} from '@/lib/attendance/evaluate-shift-attendance';
import { isOpenEndedShift } from '@/lib/schedule/open-ended-shift';
import type { WeekDay } from '@/lib/schedule/week';
import type { AttendanceRecord } from '@/lib/types/attendance';
import {
  DEFAULT_ATTENDANCE_BREAK,
  DEFAULT_ATTENDANCE_POLICY,
  DEFAULT_COMPANY_SETTINGS,
  type AttendanceBreakSettings,
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
  if (!startTime.trim() || !endTime.trim()) return 0;
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return (end - start) / 60;
}

export function employeeDateHoursKey(employeeId: string, date: string): string {
  return `${employeeId}|${normalizeInputDate(date)}`;
}

/** Billable hours from complete sessions, keyed by `employeeId|YYYY-MM-DD`. */
export function workedHoursByEmployeeDate(
  records: AttendanceRecord[],
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): Map<string, number> {
  const map = new Map<string, number>();
  const sessions = buildWorkSessionsFromRecords(records, breakSettings, timeZone);

  for (const session of sessions) {
    if (session.status !== 'complete' || session.billableHours == null) continue;
    const date = formatRecordDate(session.checkIn.timestampServer, timeZone);
    if (!date || date === '—') continue;
    const key = employeeDateHoursKey(session.checkIn.employeeId, date);
    map.set(key, (map.get(key) ?? 0) + session.billableHours);
  }

  return map;
}

/**
 * Closed roster → planned duration.
 * Open-ended + complete punch that day → punched hours (so scheduled ≈ actual).
 * Open-ended with no clock-out yet → 0.
 */
export function scheduledHoursForShift(
  shift: Shift,
  workedByEmployeeDate?: Map<string, number>,
  consumedKeys?: Set<string>,
): number {
  if (!isOpenEndedShift(shift)) {
    return shiftDurationHours(shift.startTime, shift.endTime);
  }

  if (!workedByEmployeeDate) return 0;
  const key = employeeDateHoursKey(shift.employeeId, shift.date);
  const hours = workedByEmployeeDate.get(key) ?? 0;
  if (hours <= 0) return 0;
  if (consumedKeys) {
    if (consumedKeys.has(key)) return 0;
    consumedKeys.add(key);
  }
  return hours;
}

export function sumScheduledHours(
  shifts: Shift[],
  workedByEmployeeDate?: Map<string, number>,
): number {
  const consumed = new Set<string>();
  return shifts.reduce(
    (sum, shift) =>
      sum + scheduledHoursForShift(shift, workedByEmployeeDate, consumed),
    0,
  );
}

export function filterTodayShifts(
  shifts: Shift[],
  todayKeyOrTimeZone: string = toInputDate(),
): Shift[] {
  const todayKey = todayKeyOrTimeZone.includes('/')
    ? toInputDateInTimeZone(todayKeyOrTimeZone)
    : todayKeyOrTimeZone;
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

export function listMissingCheckInShifts(
  todayShifts: Shift[],
  todayRecords: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): Shift[] {
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
  });
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

export function listNoShowShifts(
  todayShifts: Shift[],
  todayRecords: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): Shift[] {
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
  });
}

export function listLateArrivalShifts(
  todayShifts: Shift[],
  todayCheckIns: AttendanceRecord[],
  options?: AttendanceMetricsOptions,
): Array<{ shift: Shift; checkIn: AttendanceRecord }> {
  const { policy, timeZone } = resolveMetricsOptions(options);
  const checkInByEmployee = buildEarliestCheckInMap(todayCheckIns);
  const results: Array<{ shift: Shift; checkIn: AttendanceRecord }> = [];

  todayShifts.forEach((shift) => {
    const checkIn = checkInByEmployee.get(shift.employeeId);
    if (!checkIn?.timestampServer) return;

    const shiftStart = timeToMinutes(shift.startTime);
    const checkInTime = timestampToMinutesInTimeZone(checkIn.timestampServer, timeZone);

    if (isCheckInLate(checkInTime, shiftStart, policy)) {
      results.push({ shift, checkIn });
    }
  });

  return results;
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
  workedByEmployeeDate?: Map<string, number>,
): WeeklyHoursDatum[] {
  return weekDays.map((day) => {
    const dayShifts = weekShifts.filter(
      (shift) => normalizeInputDate(shift.date) === day.date,
    );
    const horas = sumScheduledHours(dayShifts, workedByEmployeeDate);

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
