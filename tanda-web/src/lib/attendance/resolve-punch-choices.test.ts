import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  resolvePunchChoices,
  type AttendanceActionRecord,
} from './resolve-attendance-action';
import type { AttendanceType } from '../types/attendance';

const timeZone = 'Australia/Sydney';
const at = new Date('2026-09-30T08:00:00.000Z');

function punch(type: AttendanceType, iso: string): AttendanceActionRecord {
  return { type, timestampMs: Date.parse(iso) };
}

function choices(
  records: AttendanceActionRecord[],
  overrides: { breaksEnabled?: boolean; breakAllowanceMinutes?: number } = {},
) {
  return resolvePunchChoices({
    records,
    timeZone,
    at,
    breaksEnabled: overrides.breaksEnabled ?? true,
    breakAllowanceMinutes: overrides.breakAllowanceMinutes ?? 30,
  });
}

test('off duty offers only clock in', () => {
  assert.deepEqual(choices([]), ['check_in']);
});

test('working with no break offers start break and clock out', () => {
  assert.deepEqual(choices([punch('check_in', '2026-09-30T07:13:00.000Z')]), [
    'break_start',
    'check_out',
  ]);
});

test('an open break can only be ended', () => {
  assert.deepEqual(
    choices([
      punch('check_in', '2026-09-30T07:13:00.000Z'),
      punch('break_start', '2026-09-30T07:15:00.000Z'),
    ]),
    ['break_end'],
  );
});

test('a break of 30 minutes or less still allows another break', () => {
  assert.deepEqual(
    choices([
      punch('check_in', '2026-09-30T06:00:00.000Z'),
      punch('break_start', '2026-09-30T06:10:00.000Z'),
      punch('break_end', '2026-09-30T06:40:00.000Z'),
    ]),
    ['break_start', 'check_out'],
  );
});

test('a break longer than the allowance leaves only clock out', () => {
  assert.deepEqual(
    choices([
      punch('check_in', '2026-09-30T06:00:00.000Z'),
      punch('break_start', '2026-09-30T06:10:00.000Z'),
      punch('break_end', '2026-09-30T06:41:00.000Z'),
    ]),
    ['check_out'],
  );
});

test('several short breaks are added together', () => {
  assert.deepEqual(
    choices([
      punch('check_in', '2026-09-30T05:00:00.000Z'),
      punch('break_start', '2026-09-30T05:10:00.000Z'),
      punch('break_end', '2026-09-30T05:30:00.000Z'),
      punch('break_start', '2026-09-30T06:00:00.000Z'),
      punch('break_end', '2026-09-30T06:20:00.000Z'),
    ]),
    ['check_out'],
  );
});

test('disabled breaks offer only clock out while working', () => {
  assert.deepEqual(
    choices([punch('check_in', '2026-09-30T07:13:00.000Z')], { breaksEnabled: false }),
    ['check_out'],
  );
});
