import type { Timestamp } from 'firebase/firestore';
import { normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import type { WeekDay } from '@/lib/schedule/week';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';
import type { ShiftLoadDatum, WeeklyHoursDatum } from './types';

function timeToMinutes(time: string): number {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function timestampToMinutes(timestamp: Timestamp): number {
  const date = timestamp.toDate();
  return date.getHours() * 60 + date.getMinutes();
}

export function shiftDurationHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  let end = timeToMinutes(endTime);
  if (end <= start) {
    end += 24 * 60;
  }
  return (end - start) / 60;
}

export function filterTodayShifts(shifts: Shift[]): Shift[] {
  const today = toInputDate();
  return shifts.filter(
    (shift) => normalizeInputDate(shift.date) === today,
  );
}

export function filterWeekShifts(
  shifts: Shift[],
  weekStart: string,
  weekEnd: string,
): Shift[] {
  return shifts.filter((shift) => {
    const date = normalizeInputDate(shift.date);
    return date >= weekStart && date <= weekEnd;
  });
}

export function countPendingLeaveRequests(requests: LeaveRequest[]): number {
  return requests.filter((request) => request.status === 'Pendiente').length;
}

export function computeLateAlerts(
  todayShifts: Shift[],
  todayCheckIns: AttendanceRecord[],
): number {
  const checkInByEmployee = new Map<string, AttendanceRecord>();

  todayCheckIns.forEach((record) => {
    if (record.type !== 'check_in' || !record.timestampServer) return;

    const existing = checkInByEmployee.get(record.employeeId);
    if (!existing?.timestampServer) {
      checkInByEmployee.set(record.employeeId, record);
      return;
    }

    if (
      record.timestampServer.toMillis() <
      existing.timestampServer.toMillis()
    ) {
      checkInByEmployee.set(record.employeeId, record);
    }
  });

  let lateCount = 0;

  todayShifts.forEach((shift) => {
    const checkIn = checkInByEmployee.get(shift.employeeId);
    if (!checkIn?.timestampServer) return;

    const shiftStart = timeToMinutes(shift.startTime);
    const checkInTime = timestampToMinutes(checkIn.timestampServer);

    if (checkInTime > shiftStart) {
      lateCount += 1;
    }
  });

  return lateCount;
}

export function buildShiftLoadByDepartment(todayShifts: Shift[]): ShiftLoadDatum[] {
  const counts = new Map<string, number>();

  todayShifts.forEach((shift) => {
    const department = shift.department.trim() || 'Sin departamento';
    counts.set(department, (counts.get(department) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([department, turnos]) => ({ department, turnos }))
    .sort((a, b) => b.turnos - a.turnos);
}

export function buildWeeklyHoursData(
  weekShifts: Shift[],
  weekDays: WeekDay[],
): WeeklyHoursDatum[] {
  return weekDays.map((day) => {
    const dayShifts = weekShifts.filter(
      (shift) => normalizeInputDate(shift.date) === day.date,
    );
    const horas = dayShifts.reduce(
      (sum, shift) => sum + shiftDurationHours(shift.startTime, shift.endTime),
      0,
    );

    return {
      day: day.label,
      horas: Math.round(horas * 10) / 10,
    };
  });
}
