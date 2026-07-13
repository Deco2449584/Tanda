import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import {
  DEFAULT_ATTENDANCE_BREAK,
  type AttendanceBreakSettings,
} from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';

export type WorkSessionStatus = 'complete' | 'open_today' | 'forgotten';

export interface BreakSegment {
  start: AttendanceRecord;
  end: AttendanceRecord | null;
  durationMinutes: number | null;
  incomplete: boolean;
}

export interface WorkSession {
  checkIn: AttendanceRecord;
  checkOut: AttendanceRecord | null;
  hours: number | null;
  billableHours: number | null;
  status: WorkSessionStatus;
  breakSegments?: BreakSegment[];
  breakOverageMinutes?: number | null;
  incompleteBreak?: boolean;
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

function diffMinutes(start: AttendanceRecord, end: AttendanceRecord): number {
  const startMs = recordTimestamp(start);
  const endMs = recordTimestamp(end);
  if (!startMs || !endMs || endMs <= startMs) return 0;
  return (endMs - startMs) / (1000 * 60);
}

export function extractBreakSegments(
  sessionRecords: AttendanceRecord[],
): BreakSegment[] {
  const sorted = [...sessionRecords].sort(
    (a, b) => recordTimestamp(a) - recordTimestamp(b),
  );
  const segments: BreakSegment[] = [];
  let pendingStart: AttendanceRecord | null = null;

  for (const record of sorted) {
    if (record.type === 'break_start') {
      if (pendingStart) {
        segments.push({
          start: pendingStart,
          end: null,
          durationMinutes: null,
          incomplete: true,
        });
      }
      pendingStart = record;
      continue;
    }

    if (record.type === 'break_end' && pendingStart) {
      const durationMinutes = diffMinutes(pendingStart, record);
      segments.push({
        start: pendingStart,
        end: record,
        durationMinutes,
        incomplete: false,
      });
      pendingStart = null;
    }
  }

  if (pendingStart) {
    segments.push({
      start: pendingStart,
      end: null,
      durationMinutes: null,
      incomplete: true,
    });
  }

  return segments;
}

export function computeBreakOverageMinutes(
  segments: BreakSegment[],
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): number | null {
  if (!breakSettings.enabled) return null;
  if (segments.some((segment) => segment.incomplete)) return null;

  const closed = segments.filter(
    (segment) => !segment.incomplete && segment.durationMinutes != null,
  );
  if (closed.length === 0) return null;

  const totalMinutes = closed.reduce(
    (sum, segment) => sum + (segment.durationMinutes ?? 0),
    0,
  );
  return Math.max(0, totalMinutes - breakSettings.durationMinutes);
}

export function calculateSessionBillableHours(
  rawHours: number,
  checkOut: AttendanceRecord | null,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  overageMinutes: number | null = null,
): number {
  if (!checkOut || rawHours <= 0) return 0;

  let hours = rawHours;

  if (
    breakSettings.enabled &&
    rawHours >= breakSettings.minShiftHours &&
    !checkOut.breakWaived
  ) {
    hours = Math.max(0, hours - breakSettings.durationMinutes / 60);
  }

  if (
    breakSettings.deductBreakOverage &&
    typeof overageMinutes === 'number' &&
    overageMinutes > 0
  ) {
    hours = Math.max(0, hours - overageMinutes / 60);
  }

  return hours;
}

function resolveOpenCheckIn(
  checkIn: AttendanceRecord,
  today: string,
  breakSegments: BreakSegment[] = [],
): WorkSession {
  const checkInDate = formatRecordDate(checkIn.timestampServer);
  const incompleteBreak = breakSegments.some((segment) => segment.incomplete);

  if (compareInputDates(checkInDate, today) < 0) {
    return {
      checkIn,
      checkOut: null,
      hours: null,
      billableHours: null,
      status: 'forgotten',
      breakSegments,
      breakOverageMinutes: null,
      incompleteBreak,
    };
  }

  return {
    checkIn,
    checkOut: null,
    hours: null,
    billableHours: null,
    status: 'open_today',
    breakSegments,
    breakOverageMinutes: null,
    incompleteBreak,
  };
}

function groupRecordsByEmployee(
  records: AttendanceRecord[],
): Map<string, AttendanceRecord[]> {
  const groups = new Map<string, AttendanceRecord[]>();

  records.forEach((record) => {
    const employeeId = record.employeeId.trim();
    if (!employeeId) return;

    const existing = groups.get(employeeId) ?? [];
    existing.push(record);
    groups.set(employeeId, existing);
  });

  return groups;
}

/** Builds sessions from a mixed employee list (e.g. admin queries). */
export function buildWorkSessionsFromRecords(
  records: AttendanceRecord[],
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): WorkSession[] {
  const sessions: WorkSession[] = [];

  groupRecordsByEmployee(records).forEach((employeeRecords) => {
    sessions.push(...buildWorkSessions(employeeRecords, breakSettings));
  });

  return sessions;
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
  let sessionRecords: AttendanceRecord[] = [];

  sorted.forEach((record) => {
    if (record.type === 'check_in') {
      if (pendingCheckIn) {
        sessions.push(
          resolveOpenCheckIn(
            pendingCheckIn,
            today,
            extractBreakSegments(sessionRecords),
          ),
        );
      }
      pendingCheckIn = record;
      sessionRecords = [record];
      return;
    }

    if (!pendingCheckIn || pendingCheckIn.employeeId !== record.employeeId) {
      return;
    }

    if (record.type === 'break_start' || record.type === 'break_end') {
      sessionRecords.push(record);
      return;
    }

    if (record.type === 'check_out') {
      sessionRecords.push(record);
      const breakSegments = extractBreakSegments(sessionRecords);
      const overageMinutes = computeBreakOverageMinutes(breakSegments, breakSettings);
      const hours = diffHours(pendingCheckIn, record);
      sessions.push({
        checkIn: pendingCheckIn,
        checkOut: record,
        hours,
        billableHours: calculateSessionBillableHours(
          hours,
          record,
          breakSettings,
          overageMinutes,
        ),
        status: 'complete',
        breakSegments,
        breakOverageMinutes: overageMinutes,
        incompleteBreak: breakSegments.some((segment) => segment.incomplete),
      });
      pendingCheckIn = null;
      sessionRecords = [];
    }
  });

  if (pendingCheckIn) {
    sessions.push(
      resolveOpenCheckIn(
        pendingCheckIn,
        today,
        extractBreakSegments(sessionRecords),
      ),
    );
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
  return listForgottenCheckIns(records).length;
}

export function listForgottenCheckIns(records: AttendanceRecord[]): AttendanceRecord[] {
  const checkIns = records.filter((record) => record.type === 'check_in');

  return checkIns.filter((checkIn) => isForgottenCheckIn(checkIn, records));
}

function completeSessionsInRange(
  records: AttendanceRecord[],
  rangeStart: string,
  rangeEnd: string,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
) {
  return buildWorkSessionsFromRecords(records, breakSettings).filter((session) => {
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
