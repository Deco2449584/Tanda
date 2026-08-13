import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Timestamp } from 'firebase/firestore';
import type { WorkSession } from '../attendance/work-sessions';
import type { Employee } from '../types/employee';
import type { Location } from '../types/location';
import { DEFAULT_PAY_RULES } from './default-pay-rules';
import { buildAwardReport } from './award-calc';
import type { PayRules } from '../types/pay-rules';

function fakeTs(iso: string): Timestamp {
  const date = new Date(iso);
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  } as Timestamp;
}

function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp1',
    employeeId: 'E1',
    name: 'Alex',
    email: 'alex@example.com',
    department: 'Warehouse',
    hourlyRate: 25,
    active: true,
    lastAction: 'none',
    ...overrides,
  };
}

function location(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc1',
    name: 'Sydney WH',
    city: 'Sydney',
    active: true,
    ...overrides,
  };
}

function session(startIso: string, endIso: string, hours: number): WorkSession {
  return {
    checkIn: {
      id: `in-${startIso}`,
      employeeId: 'E1',
      employeeNameSnapshot: 'Alex',
      type: 'check_in',
      timestampServer: fakeTs(startIso),
      photoUrl: '',
      source: 'test',
    },
    checkOut: {
      id: `out-${endIso}`,
      employeeId: 'E1',
      employeeNameSnapshot: 'Alex',
      type: 'check_out',
      timestampServer: fakeTs(endIso),
      photoUrl: '',
      source: 'test',
    },
    hours,
    billableHours: hours,
    status: 'complete',
  };
}

function run(input: {
  rules?: PayRules;
  employees?: Employee[];
  locations?: Location[];
  sessions: WorkSession[];
}) {
  return buildAwardReport({
    rules: input.rules ?? DEFAULT_PAY_RULES,
    timeZone: 'Australia/Sydney',
    employees: input.employees ?? [employee()],
    locations: input.locations ?? [location()],
    sessions: input.sessions,
  });
}

test('2h Saturday with 4h min pay and charge uses hourlyRate fallback', () => {
  const report = run({
    sessions: [session('2026-08-08T02:00:00+10:00', '2026-08-08T04:00:00+10:00', 2)],
  });
  assert.equal(report.sessions[0]?.payHours, 4);
  assert.equal(report.sessions[0]?.chargeHours, 4);
  assert.equal(report.totals.payAmount, 100);
  assert.equal(report.totals.chargeAmount, 100);
});

test('min pay 0 and min charge 4 only inflates charge', () => {
  const report = run({
    rules: { ...DEFAULT_PAY_RULES, minPayHours: 0, minChargeHours: 4 },
    sessions: [session('2026-08-08T02:00:00+10:00', '2026-08-08T04:00:00+10:00', 2)],
  });
  assert.equal(report.sessions[0]?.payHours, 2);
  assert.equal(report.sessions[0]?.chargeHours, 4);
  assert.equal(report.totals.payAmount, 50);
  assert.equal(report.totals.chargeAmount, 100);
});

test('daily OT after 8 hours marks the overflow as overtime', () => {
  const report = run({
    sessions: [session('2026-08-10T08:00:00+10:00', '2026-08-10T18:00:00+10:00', 10)],
  });
  const overtime = report.slices.filter((slice) => slice.overtime);
  const ordinary = report.slices.filter((slice) => !slice.overtime);
  const otHours = overtime.reduce((sum, slice) => sum + slice.payHours, 0);
  const ordinaryHours = ordinary.reduce((sum, slice) => sum + slice.payHours, 0);
  assert.equal(ordinaryHours, 8);
  assert.equal(otHours, 2);
});

test('band crossover splits early morning and base', () => {
  const report = run({
    rules: { ...DEFAULT_PAY_RULES, minPayHours: 0, minChargeHours: 0 },
    sessions: [session('2026-08-10T05:30:00+10:00', '2026-08-10T06:30:00+10:00', 1)],
  });
  const early = report.slices.find((slice) => slice.bandId === 'early_morning');
  const base = report.slices.find((slice) => slice.bandId === 'base');
  assert.ok(early);
  assert.ok(base);
  assert.equal(early?.payHours, 0.5);
  assert.equal(base?.payHours, 0.5);
});

test('public holiday uses the holiday day type', () => {
  const report = run({
    rules: {
      ...DEFAULT_PAY_RULES,
      minPayHours: 0,
      minChargeHours: 0,
      publicHolidays: [{ date: '2026-08-10' }],
    },
    sessions: [session('2026-08-10T09:00:00+10:00', '2026-08-10T10:00:00+10:00', 1)],
  });
  assert.equal(report.slices[0]?.dayTypeId, 'public_holiday');
});

test('weekly OT applies across sessions without double counting daily OT', () => {
  const rules: PayRules = {
    ...DEFAULT_PAY_RULES,
    minPayHours: 0,
    minChargeHours: 0,
    overtimeRules: [
      { id: 'ot_weekly', scope: 'weekly', thresholdHours: 10, applyTo: 'overtime' },
    ],
  };
  const report = run({
    rules,
    sessions: [
      session('2026-08-10T08:00:00+10:00', '2026-08-10T16:00:00+10:00', 8),
      session('2026-08-11T08:00:00+10:00', '2026-08-11T16:00:00+10:00', 8),
    ],
  });
  const otHours = report.slices
    .filter((slice) => slice.overtime)
    .reduce((sum, slice) => sum + slice.payHours, 0);
  assert.equal(otHours, 6);
});
