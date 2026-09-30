import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Timestamp } from 'firebase/firestore';
import type { AttendanceRecord } from '../types/attendance';
import type { Shift } from '../types/shift';
import {
  formatShiftTimeRange,
  formatShiftTimeRangeShort,
} from './week';
import {
  formatShiftTimeRangePlain,
  isOpenEndedShift,
} from './open-ended-shift';
import {
  scheduledHoursForShift,
  shiftDurationHours,
  sumScheduledHours,
  workedHoursByEmployeeDate,
} from '../dashboard/compute-metrics';
import { buildSessionsFromShifts } from '../payroll/compute-award-pay';
import { DEFAULT_ATTENDANCE_BREAK } from '../types/company-settings';
import type { Employee } from '../types/employee';

function shift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 's1',
    employeeId: 'E1',
    date: '2026-09-28',
    startTime: '09:00',
    endTime: '17:00',
    department: 'Warehouse',
    status: 'scheduled',
    ...overrides,
  };
}

function fakeTs(date: Date): Timestamp {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  } as Timestamp;
}

function record(
  type: AttendanceRecord['type'],
  at: Date,
  employeeId = 'E1',
): AttendanceRecord {
  return {
    id: `${type}-${at.toISOString()}`,
    employeeId,
    employeeNameSnapshot: 'Alex',
    type,
    timestampServer: fakeTs(at),
    photoUrl: '',
    source: 'test',
  };
}

const noBreak = { ...DEFAULT_ATTENDANCE_BREAK, enabled: false };

test('isOpenEndedShift: empty or whitespace end is open', () => {
  assert.equal(isOpenEndedShift({ endTime: '' }), true);
  assert.equal(isOpenEndedShift({ endTime: '   ' }), true);
  assert.equal(isOpenEndedShift({ endTime: undefined }), true);
  assert.equal(isOpenEndedShift({ endTime: '17:00' }), false);
});

test('format open-ended ranges', () => {
  assert.equal(formatShiftTimeRangePlain('09:00', '17:00'), '09:00–17:00');
  assert.equal(formatShiftTimeRangePlain('09:00', ''), '09:00 → open');
  assert.equal(formatShiftTimeRangePlain('09:00'), '09:00 → open');
  assert.equal(formatShiftTimeRangePlain(undefined, undefined), '');
  assert.equal(formatShiftTimeRangeShort('09:00', '17:00'), '9a–5p');
  assert.equal(formatShiftTimeRangeShort('09:00', ''), '9a → open');
  assert.match(formatShiftTimeRange('09:00', ''), /open/);
});

test('shiftDurationHours: empty end is 0, not a 24h wrap', () => {
  assert.equal(shiftDurationHours('09:00', ''), 0);
  assert.equal(shiftDurationHours('09:00', '17:00'), 8);
  assert.equal(shiftDurationHours('22:00', '06:00'), 8);
});

test('scheduledHoursForShift: closed uses roster duration', () => {
  assert.equal(scheduledHoursForShift(shift()), 8);
});

test('scheduledHoursForShift: open without punch is 0', () => {
  const open = shift({ endTime: '' });
  assert.equal(scheduledHoursForShift(open), 0);
  assert.equal(scheduledHoursForShift(open, new Map()), 0);
});

test('scheduledHoursForShift: open with complete punch uses worked hours', () => {
  const open = shift({ endTime: '' });
  const records = [
    record('check_in', new Date('2026-09-27T23:00:00.000Z')),
    record('check_out', new Date('2026-09-28T04:00:00.000Z')),
  ];
  const worked = workedHoursByEmployeeDate(records, noBreak);
  assert.equal(scheduledHoursForShift(open, worked), 5);
});

test('sumScheduledHours: does not double-count two open shifts on the same day', () => {
  const records = [
    record('check_in', new Date('2026-09-27T23:00:00.000Z')),
    record('check_out', new Date('2026-09-28T04:00:00.000Z')),
  ];
  const worked = workedHoursByEmployeeDate(records, noBreak);
  const hours = sumScheduledHours(
    [shift({ id: 'a', endTime: '' }), shift({ id: 'b', endTime: '' })],
    worked,
  );
  assert.equal(hours, 5);
});

test('buildSessionsFromShifts skips open-ended roster slots', () => {
  const employee: Employee = {
    id: 'emp1',
    employeeId: 'E1',
    name: 'Alex',
    email: 'alex@example.com',
    department: 'Warehouse',
    hourlyRate: 25,
    active: true,
    lastAction: 'none',
  };

  const sessions = buildSessionsFromShifts({
    shifts: [shift({ endTime: '' }), shift({ id: 'closed', endTime: '17:00' })],
    employees: [employee],
    timeZone: 'Australia/Sydney',
    attendanceBreak: noBreak,
  });

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0]?.hours, 8);
});
