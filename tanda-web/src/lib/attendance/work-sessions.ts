import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import {
  DEFAULT_ATTENDANCE_BREAK,
  type AttendanceBreakSettings,
} from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type WorkSessionStatus = 'complete' | 'open_today' | 'forgotten';

export interface WorkSession {
  checkIn: AttendanceRecord;
  checkOut: AttendanceRecord | null;
  hours: number | null;
  billableHours: number | null;
  status: WorkSessionStatus;
}

function recordTimestamp(record: AttendanceRecord): number {
  return record.timestampServer?.toMillis() ?? 0;
}

function diffHours(checkIn: AttendanceRecord, checkOut: AttendanceRecord): number {
  const start = recordTimestamp(checkIn);
  const end = recordTimestamp(checkOut);
  if (!start || !end || end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

export function calculateSessionBillableHours(
  rawHours: number,
  checkOut: AttendanceRecord | null,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): number {
  if (!checkOut || rawHours <= 0) return 0;
  if (!breakSettings.enabled) return rawHours;
  if (rawHours < breakSettings.minShiftHours) return rawHours;
  if (checkOut.breakWaived) return rawHours;

  const deduction = breakSettings.durationMinutes / 60;
  return Math.max(0, rawHours - deduction);
}

function resolveOpenCheckIn(
  checkIn: AttendanceRecord,
  today: string,
): WorkSession {
  const checkInDate = formatRecordDate(checkIn.timestampServer);

  if (compareInputDates(checkInDate, today) < 0) {
    return {
      checkIn,
      checkOut: null,
      hours: null,
      billableHours: null,
      status: 'forgotten',
    };
  }

  return {
    checkIn,
    checkOut: null,
    hours: null,
    billableHours: null,
    status: 'open_today',
  };
}

export function buildWorkSessions(
  records: AttendanceRecord[],
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): WorkSession[] {
  const sorted = [...records].sort(
    (a, b) => recordTimestamp(a) - recordTimestamp(b),
  );
  const sessions: WorkSession[] = [];
  const today = toInputDate();
  let pendingCheckIn: AttendanceRecord | null = null;

  sorted.forEach((record) => {
    if (record.type === 'check_in') {
      if (pendingCheckIn) {
        sessions.push(resolveOpenCheckIn(pendingCheckIn, today));
      }
      pendingCheckIn = record;
      return;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      const hours = diffHours(pendingCheckIn, record);
      sessions.push({
        checkIn: pendingCheckIn,
        checkOut: record,
        hours,
        billableHours: calculateSessionBillableHours(hours, record, breakSettings),
        status: 'complete',
      });
      pendingCheckIn = null;
    }
  });

  if (pendingCheckIn) {
    sessions.push(resolveOpenCheckIn(pendingCheckIn, today));
  }

  return sessions;
}

export function isForgottenCheckIn(
  record: AttendanceRecord,
  allRecords: AttendanceRecord[],
): boolean {
  if (record.type !== 'check_in' || !record.timestampServer) return false;

  const employeeRecords = allRecords
    .filter((item) => item.employeeId === record.employeeId)
    .sort((a, b) => recordTimestamp(a) - recordTimestamp(b));

  const sessions = buildWorkSessions(employeeRecords);
  return sessions.some(
    (session) =>
      session.checkIn.id === record.id && session.status === 'forgotten',
  );
}

export function countForgottenCheckIns(records: AttendanceRecord[]): number {
  const checkIns = records.filter((record) => record.type === 'check_in');

  return checkIns.filter((checkIn) =>
    isForgottenCheckIn(checkIn, records),
  ).length;
}

function completeSessionsInRange(
  records: AttendanceRecord[],
  rangeStart: string,
  rangeEnd: string,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
) {
  return buildWorkSessions(records, breakSettings).filter((session) => {
    if (session.status !== 'complete' || session.hours === null) {
      return false;
    }

    const sessionDate = formatRecordDate(session.checkIn.timestampServer);
    return (
      compareInputDates(sessionDate, rangeStart) >= 0 &&
      compareInputDates(sessionDate, rangeEnd) <= 0
    );
  });
}

export function calculateWorkedHoursInRange(
  records: AttendanceRecord[],
  rangeStart: string,
  rangeEnd: string,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): number {
  return completeSessionsInRange(records, rangeStart, rangeEnd, breakSettings).reduce(
    (total, session) => total + (session.billableHours ?? 0),
    0,
  );
}

export function calculateWorkedDaysInRange(
  records: AttendanceRecord[],
  rangeStart: string,
  rangeEnd: string,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): number {
  const dates = new Set<string>();

  completeSessionsInRange(records, rangeStart, rangeEnd, breakSettings).forEach(
    (session) => {
      dates.add(formatRecordDate(session.checkIn.timestampServer));
    },
  );

  return dates.size;
}

export function getMonthDateRange(reference: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}

export function getYearDateRange(reference: Date = new Date()): {
  start: string;
  end: string;
} {
  const year = reference.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}
