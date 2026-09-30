import { Timestamp } from 'firebase/firestore';
import {
  dateFromWallClock,
  formatClockTimeInTimeZone,
  toInputDateInTimeZone,
} from '@/lib/dates/timezone';
import type { AttendanceType } from '@/lib/types/attendance';
import { DEFAULT_COMPANY_SETTINGS } from '@/lib/types/company-settings';

export function formatAttendanceType(type: AttendanceType | string): string {
  if (type === 'check_in') return 'Check-in';
  if (type === 'check_out') return 'Check-out';
  if (type === 'break_start') return 'Break start';
  if (type === 'break_end') return 'Break end';
  return type;
}

export function formatRecordDate(
  timestamp: Timestamp | null,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): string {
  if (!timestamp) return '—';
  return toInputDateInTimeZone(timeZone, timestamp.toDate());
}

export function formatRecordDateShort(
  timestamp: Timestamp | null,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): string {
  if (!timestamp) return '—';

  return timestamp.toDate().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    timeZone,
  });
}

export function formatRecordTime(
  timestamp: Timestamp | null,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): string {
  if (!timestamp) return '—';

  return timestamp.toDate().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  });
}

export function formatRecordTimestamp(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';

  return `${formatRecordDate(timestamp)} ${formatRecordTime(timestamp)}`;
}

export function timestampToFormValues(
  timestamp: Timestamp | null,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): {
  date: string;
  time: string;
} {
  const date = timestamp?.toDate() ?? new Date();

  return {
    date: toInputDateInTimeZone(timeZone, date),
    time: formatClockTimeInTimeZone(timeZone, date),
  };
}

export function formValuesToTimestamp(
  date: string,
  time: string,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): Timestamp {
  const clock = /^\d{1,2}:\d{2}/.test(time) ? time : '00:00';
  return Timestamp.fromDate(dateFromWallClock(date, clock, timeZone));
}
