import { formatRecordDate } from '@/lib/attendance/format';
import { buildWorkSessions } from '@/lib/attendance/work-sessions';
import {
  compareInputDates,
  normalizeInputDate,
  toInputDate,
} from '@/lib/dates/input-date';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Shift, ShiftStatus } from '@/lib/types/shift';

export function resolveShiftDisplayStatus(
  shift: Shift,
  attendanceRecords: AttendanceRecord[],
): ShiftStatus {
  if (shift.status === 'absent') return 'absent';
  if (shift.status === 'completed') return 'completed';

  const shiftDate = normalizeInputDate(shift.date);
  const today = toInputDate();

  const employeeRecords = attendanceRecords.filter(
    (record) => record.employeeId === shift.employeeId,
  );

  if (employeeRecords.length > 0) {
    const sessions = buildWorkSessions(employeeRecords);
    const hasCompleteOnDate = sessions.some((session) => {
      if (session.status !== 'complete' || !session.checkIn.timestampServer) {
        return false;
      }
      return formatRecordDate(session.checkIn.timestampServer) === shiftDate;
    });

    if (hasCompleteOnDate) return 'completed';
  }

  if (compareInputDates(shiftDate, today) < 0) {
    return 'absent';
  }

  return 'scheduled';
}

export function applyResolvedShiftStatuses(
  shifts: Shift[],
  attendanceRecords: AttendanceRecord[],
): Shift[] {
  return shifts.map((shift) => ({
    ...shift,
    status: resolveShiftDisplayStatus(shift, attendanceRecords),
  }));
}
