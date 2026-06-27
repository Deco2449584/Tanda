import { timeToMinutes } from '@/lib/attendance/evaluate-shift-attendance';
import { getMinutesInTimeZone } from '@/lib/dates/timezone';
import type { AttendanceRestrictionsSettings } from '@/lib/types/company-settings';

export type AttendanceRestrictionCode = 'early_clock_in' | 'unscheduled_shift';

export interface AttendanceRestrictionViolation {
  code: AttendanceRestrictionCode;
  message: string;
}

export interface ShiftWindow {
  date: string;
  startTime: string;
  endTime: string;
}

function formatClockTime(time: string): string {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function validateCheckInRestrictions(input: {
  restrictions: AttendanceRestrictionsSettings;
  timeZone: string;
  punchAt: Date;
  shiftsOnDate: ShiftWindow[];
}): AttendanceRestrictionViolation | null {
  const { restrictions, timeZone, punchAt, shiftsOnDate } = input;

  if (restrictions.blockUnscheduledShift && shiftsOnDate.length === 0) {
    return {
      code: 'unscheduled_shift',
      message: 'Check-in is not allowed without a scheduled shift for this date.',
    };
  }

  if (!restrictions.blockEarlyClockIn || shiftsOnDate.length === 0) {
    return null;
  }

  const punchMinutes = getMinutesInTimeZone(timeZone, punchAt);
  const allowed = shiftsOnDate.some((shift) => {
    const earliest = timeToMinutes(shift.startTime) - restrictions.blockEarlyClockInMinutes;
    return punchMinutes >= earliest;
  });

  if (allowed) return null;

  const earliestShift = [...shiftsOnDate].sort(
    (left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime),
  )[0];

  const earliestAllowedMinutes =
    timeToMinutes(earliestShift.startTime) - restrictions.blockEarlyClockInMinutes;
  const earliestHour = Math.floor(earliestAllowedMinutes / 60);
  const earliestMinute = earliestAllowedMinutes % 60;
  const earliestLabel = formatClockTime(
    `${String(earliestHour).padStart(2, '0')}:${String(earliestMinute).padStart(2, '0')}`,
  );

  return {
    code: 'early_clock_in',
    message: `Check-in is too early. Earliest allowed time today is ${earliestLabel} (${restrictions.blockEarlyClockInMinutes} min before shift).`,
  };
}

export function isRestrictionsEnforced(
  restrictions: AttendanceRestrictionsSettings,
): boolean {
  return restrictions.blockEarlyClockIn || restrictions.blockUnscheduledShift;
}
