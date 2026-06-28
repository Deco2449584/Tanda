import type { Timestamp } from 'firebase/firestore';
import {
  resolveAttendanceAction,
  type AttendanceActionRecord,
} from '@/lib/attendance/resolve-attendance-action';
import { compareInputDates, toInputDate } from '@/lib/dates/input-date';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';

type TimestampLike = Timestamp | { toDate(): Date } | null | undefined;

function dateFromTimestamp(timestamp: { toDate(): Date }): string {
  return toInputDate(timestamp.toDate());
}

/**
 * @deprecated Prefer resolveAttendanceAction with full record history on the server.
 * Kept for Expo kiosk client fallback when records are unavailable offline.
 */
export function resolveKioskAction(
  lastAction: string | undefined,
  lastTimestampServer: TimestampLike,
  options?: { timeZone?: string; at?: Date },
): 'check_in' | 'check_out' {
  const timeZone = options?.timeZone;
  const at = options?.at ?? new Date();
  const today = timeZone ? toInputDateInTimeZone(timeZone, at) : toInputDate(at);

  if (lastAction !== 'check_in') {
    return 'check_in';
  }

  if (!lastTimestampServer) {
    return 'check_out';
  }

  const lastDate = timeZone
    ? toInputDateInTimeZone(timeZone, lastTimestampServer.toDate())
    : dateFromTimestamp(lastTimestampServer);

  if (compareInputDates(lastDate, today) < 0) {
    return 'check_in';
  }

  return 'check_out';
}

/** Records-first resolver with optional cache fallback (no records). */
export function resolveKioskActionWithRecords(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
  lastAction?: string;
  lastTimestampServer?: TimestampLike;
}): 'check_in' | 'check_out' {
  if (input.records.length > 0) {
    return resolveAttendanceAction({
      records: input.records,
      timeZone: input.timeZone,
      at: input.at,
    });
  }

  return resolveKioskAction(input.lastAction, input.lastTimestampServer, {
    timeZone: input.timeZone,
    at: input.at,
  });
}
