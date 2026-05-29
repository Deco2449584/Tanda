import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type WorkSessionStatus = 'complete' | 'open_today' | 'forgotten';

export interface WorkSession {
  checkIn: AttendanceRecord;
  checkOut: AttendanceRecord | null;
  hours: number | null;
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
      status: 'forgotten',
    };
  }

  return {
    checkIn,
    checkOut: null,
    hours: null,
    status: 'open_today',
  };
}

export function buildWorkSessions(records: AttendanceRecord[]): WorkSession[] {
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
      sessions.push({
        checkIn: pendingCheckIn,
        checkOut: record,
        hours: diffHours(pendingCheckIn, record),
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

export function calculateWorkedHoursInRange(
  records: AttendanceRecord[],
  rangeStart: string,
  rangeEnd: string,
): number {
  const sessions = buildWorkSessions(records);

  return sessions.reduce((total, session) => {
    if (session.status !== 'complete' || session.hours === null) {
      return total;
    }

    const sessionDate = formatRecordDate(session.checkIn.timestampServer);
    if (
      compareInputDates(sessionDate, rangeStart) < 0 ||
      compareInputDates(sessionDate, rangeEnd) > 0
    ) {
      return total;
    }

    return total + session.hours;
  }, 0);
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
