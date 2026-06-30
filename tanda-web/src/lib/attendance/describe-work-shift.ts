import { formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import { formatWarehouseLabel } from '@/lib/attendance/location-display';
import { compareInputDates } from '@/lib/dates/input-date';
import type { WorkSession } from '@/lib/attendance/work-sessions';
import {
  DEFAULT_ATTENDANCE_BREAK,
  type AttendanceBreakSettings,
} from '@/lib/types/company-settings';

export interface WorkShiftBreakInfo {
  taken: boolean;
  waived: boolean;
  durationMinutes: number | null;
  summary: string;
}

export interface WorkedShiftRow {
  id: string;
  employeeId: string;
  employeeName: string;
  photoUrl: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  grossHours: number;
  billableHours: number;
  break: WorkShiftBreakInfo;
  locationLabel: string;
}

export function describeWorkShiftBreak(
  session: WorkSession,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
): WorkShiftBreakInfo {
  if (session.status !== 'complete' || session.hours === null || !session.checkOut) {
    return {
      taken: false,
      waived: false,
      durationMinutes: null,
      summary: '—',
    };
  }

  if (!breakSettings.enabled) {
    return {
      taken: false,
      waived: false,
      durationMinutes: null,
      summary: 'No break deducted',
    };
  }

  if (session.hours < breakSettings.minShiftHours) {
    return {
      taken: false,
      waived: false,
      durationMinutes: null,
      summary: `No break (shift under ${breakSettings.minShiftHours}h)`,
    };
  }

  if (session.checkOut.breakWaived) {
    return {
      taken: false,
      waived: true,
      durationMinutes: breakSettings.durationMinutes,
      summary: 'Break waived — no deduction',
    };
  }

  const deducted =
    session.billableHours !== null &&
    session.hours - session.billableHours >= breakSettings.durationMinutes / 60 - 0.01;

  if (!deducted) {
    return {
      taken: false,
      waived: false,
      durationMinutes: null,
      summary: 'No break deducted',
    };
  }

  return {
    taken: true,
    waived: false,
    durationMinutes: breakSettings.durationMinutes,
    summary: `${breakSettings.durationMinutes} min unpaid break deducted`,
  };
}

export function formatWorkedHours(hours: number | null): string {
  if (hours === null) return '—';
  return `${hours.toFixed(2)}h`;
}

export function workSessionToRow(
  session: WorkSession,
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  employeePhotoUrl?: string,
): WorkedShiftRow | null {
  if (session.status !== 'complete' || !session.checkOut) {
    return null;
  }

  const checkIn = session.checkIn;
  const attendancePhoto =
    checkIn.photoUrl?.trim() || session.checkOut.photoUrl?.trim() || '';
  const name =
    checkIn.employeeNameSnapshot?.trim() ||
    session.checkOut.employeeNameSnapshot?.trim() ||
    checkIn.employeeId;

  return {
    id: checkIn.id,
    employeeId: checkIn.employeeId,
    employeeName: name,
    photoUrl: employeePhotoUrl?.trim() || attendancePhoto,
    date: formatRecordDate(checkIn.timestampServer),
    checkInTime: formatRecordTime(checkIn.timestampServer),
    checkOutTime: formatRecordTime(session.checkOut.timestampServer),
    grossHours: session.hours ?? 0,
    billableHours: session.billableHours ?? 0,
    break: describeWorkShiftBreak(session, breakSettings),
    locationLabel: formatWarehouseLabel(checkIn),
  };
}

export function filterSessionsByDateRange(
  sessions: WorkSession[],
  rangeStart: string,
  rangeEnd: string,
): WorkSession[] {
  return sessions.filter((session) => {
    const sessionDate = formatRecordDate(session.checkIn.timestampServer);
    return (
      compareInputDates(sessionDate, rangeStart) >= 0 &&
      compareInputDates(sessionDate, rangeEnd) <= 0
    );
  });
}

export function sortWorkedShiftRows(rows: WorkedShiftRow[]): WorkedShiftRow[] {
  return [...rows].sort((a, b) => {
    const dateCompare = compareInputDates(b.date, a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.checkInTime.localeCompare(a.checkInTime);
  });
}

export function mapSessionsToRows(
  sessions: WorkSession[],
  breakSettings: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  employeePhotos: Record<string, string> = {},
): WorkedShiftRow[] {
  return sortWorkedShiftRows(
    sessions
      .map((session) =>
        workSessionToRow(
          session,
          breakSettings,
          employeePhotos[session.checkIn.employeeId],
        ),
      )
      .filter((row): row is WorkedShiftRow => row !== null),
  );
}
