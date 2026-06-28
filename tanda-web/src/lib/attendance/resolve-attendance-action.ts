import { compareInputDates } from '@/lib/dates/input-date';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import type { AttendanceType } from '@/lib/types/attendance';

export interface AttendanceActionRecord {
  type: AttendanceType;
  timestampMs: number;
}

export type EmployeePresenceAction = AttendanceType | 'none';

export interface DerivedEmployeePresence {
  lastAction: EmployeePresenceAction;
  lastTimestampMs: number | null;
}

function recordTimestamp(record: AttendanceActionRecord): number {
  return record.timestampMs;
}

function recordDateInTimeZone(timeZone: string, timestampMs: number): string {
  return toInputDateInTimeZone(timeZone, new Date(timestampMs));
}

/**
 * Next punch type from attendance history (source of truth).
 * Mirrors work-sessions: open check-in today → check_out; otherwise check_in.
 */
export function resolveAttendanceAction(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): AttendanceType {
  const today = toInputDateInTimeZone(input.timeZone, input.at ?? new Date());
  const sorted = [...input.records]
    .filter((record) => record.timestampMs > 0)
    .sort((a, b) => recordTimestamp(a) - recordTimestamp(b));

  let pendingCheckIn: AttendanceActionRecord | null = null;

  for (const record of sorted) {
    if (record.type === 'check_in') {
      pendingCheckIn = record;
      continue;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      pendingCheckIn = null;
    }
  }

  if (!pendingCheckIn) {
    return 'check_in';
  }

  const checkInDate = recordDateInTimeZone(input.timeZone, pendingCheckIn.timestampMs);
  if (compareInputDates(checkInDate, today) < 0) {
    return 'check_in';
  }

  return 'check_out';
}

/** Cache fields on employees that should reflect the latest attendance history. */
export function deriveEmployeePresence(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): DerivedEmployeePresence {
  const today = toInputDateInTimeZone(input.timeZone, input.at ?? new Date());
  const sorted = [...input.records]
    .filter((record) => record.timestampMs > 0)
    .sort((a, b) => recordTimestamp(a) - recordTimestamp(b));

  if (sorted.length === 0) {
    return { lastAction: 'none', lastTimestampMs: null };
  }

  let pendingCheckIn: AttendanceActionRecord | null = null;

  for (const record of sorted) {
    if (record.type === 'check_in') {
      pendingCheckIn = record;
      continue;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      pendingCheckIn = null;
    }
  }

  if (pendingCheckIn) {
    const checkInDate = recordDateInTimeZone(input.timeZone, pendingCheckIn.timestampMs);
    if (compareInputDates(checkInDate, today) >= 0) {
      return {
        lastAction: 'check_in',
        lastTimestampMs: pendingCheckIn.timestampMs,
      };
    }
  }

  const latest = sorted[sorted.length - 1]!;
  return {
    lastAction: latest.type,
    lastTimestampMs: latest.timestampMs,
  };
}

export function presenceVersion(
  lastAction: string | undefined,
  lastTimestampMs: number | null | undefined,
): string {
  const action = lastAction?.trim() || 'none';
  const ms = typeof lastTimestampMs === 'number' && Number.isFinite(lastTimestampMs)
    ? lastTimestampMs
    : 0;
  return `${action}:${ms}`;
}

export function presenceVersionFromEmployeeData(data: Record<string, unknown>): string {
  const lastAction =
    typeof data.lastAction === 'string' ? data.lastAction : undefined;
  const rawTimestamp = data.lastTimestampServer;
  const lastTimestampMs =
    rawTimestamp &&
    typeof rawTimestamp === 'object' &&
    'toDate' in rawTimestamp &&
    typeof rawTimestamp.toDate === 'function'
      ? rawTimestamp.toDate().getTime()
      : null;

  return presenceVersion(lastAction, lastTimestampMs);
}
