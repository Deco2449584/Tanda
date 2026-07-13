import { compareInputDates } from '@/lib/dates/input-date';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import type { AttendanceType } from '@/lib/types/attendance';

export interface AttendanceActionRecord {
  type: AttendanceType;
  timestampMs: number;
}

export type AttendanceWorkState = 'off_duty' | 'working' | 'on_break';

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

function sortedRecords(records: AttendanceActionRecord[]): AttendanceActionRecord[] {
  return [...records]
    .filter((record) => record.timestampMs > 0)
    .sort((a, b) => recordTimestamp(a) - recordTimestamp(b));
}

/**
 * Current work state from attendance history.
 * Break punches nest inside an open check-in; they do not close the shift.
 */
export function resolveAttendanceState(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): AttendanceWorkState {
  const today = toInputDateInTimeZone(input.timeZone, input.at ?? new Date());
  const sorted = sortedRecords(input.records);

  let pendingCheckIn: AttendanceActionRecord | null = null;
  let onBreak = false;

  for (const record of sorted) {
    if (record.type === 'check_in') {
      pendingCheckIn = record;
      onBreak = false;
      continue;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      pendingCheckIn = null;
      onBreak = false;
      continue;
    }

    if (!pendingCheckIn) continue;

    if (record.type === 'break_start') {
      onBreak = true;
      continue;
    }

    if (record.type === 'break_end') {
      onBreak = false;
    }
  }

  if (!pendingCheckIn) {
    return 'off_duty';
  }

  const checkInDate = recordDateInTimeZone(input.timeZone, pendingCheckIn.timestampMs);
  if (compareInputDates(checkInDate, today) < 0) {
    return 'off_duty';
  }

  return onBreak ? 'on_break' : 'working';
}

export function resolveAllowedAttendanceActions(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): AttendanceType[] {
  const state = resolveAttendanceState(input);

  switch (state) {
    case 'off_duty':
      return ['check_in'];
    case 'working':
      return ['break_start', 'check_out'];
    case 'on_break':
      return ['break_end', 'check_out'];
  }
}

/**
 * Next punch when there is exactly one allowed action.
 * Prefer break_end when on break, check_in when off duty.
 * When multiple actions are allowed, returns the first (UI must let the user choose).
 */
export function resolveAttendanceAction(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): AttendanceType {
  const allowed = resolveAllowedAttendanceActions(input);
  return allowed[0] ?? 'check_in';
}

/** Cache fields on employees that should reflect the latest attendance history. */
export function deriveEmployeePresence(input: {
  records: AttendanceActionRecord[];
  timeZone: string;
  at?: Date;
}): DerivedEmployeePresence {
  const today = toInputDateInTimeZone(input.timeZone, input.at ?? new Date());
  const sorted = sortedRecords(input.records);

  if (sorted.length === 0) {
    return { lastAction: 'none', lastTimestampMs: null };
  }

  let pendingCheckIn: AttendanceActionRecord | null = null;
  let lastBreakAction: AttendanceActionRecord | null = null;

  for (const record of sorted) {
    if (record.type === 'check_in') {
      pendingCheckIn = record;
      lastBreakAction = null;
      continue;
    }

    if (record.type === 'check_out' && pendingCheckIn) {
      pendingCheckIn = null;
      lastBreakAction = null;
      continue;
    }

    if (!pendingCheckIn) continue;

    if (record.type === 'break_start' || record.type === 'break_end') {
      lastBreakAction = record;
    }
  }

  if (pendingCheckIn) {
    const checkInDate = recordDateInTimeZone(input.timeZone, pendingCheckIn.timestampMs);
    if (compareInputDates(checkInDate, today) >= 0) {
      if (lastBreakAction?.type === 'break_start') {
        return {
          lastAction: 'break_start',
          lastTimestampMs: lastBreakAction.timestampMs,
        };
      }

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

export function isAttendanceType(value: unknown): value is AttendanceType {
  return (
    value === 'check_in' ||
    value === 'check_out' ||
    value === 'break_start' ||
    value === 'break_end'
  );
}
