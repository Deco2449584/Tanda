import { toInputDateInTimeZone, getMinutesInTimeZone } from '@/lib/dates/timezone';
import type { WorkSession } from '@/lib/attendance/work-sessions';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Shift } from '@/lib/types/shift';
import {
  BASE_BAND_ID,
  OVERTIME_BAND_ID,
  rateCellKey,
  type PayDayType,
  type PayRateCell,
  type PayRateCells,
  type PayRules,
  type PayTimeBand,
  type SiteBilling,
  type StaffPayRates,
} from '@/lib/types/pay-rules';

export interface AwardSlice {
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  employmentTypeId: string;
  locationId: string;
  locationName: string;
  date: string;
  sessionKey: string;
  dayTypeId: string;
  bandId: string;
  overtime: boolean;
  hours: number;
  payHours: number;
  chargeHours: number;
  payRate: number;
  chargeRate: number;
  payAmount: number;
  chargeAmount: number;
  usedFallbackRate?: boolean;
}

export interface AwardSessionLine {
  sessionKey: string;
  employeeDocId: string;
  employeeId: string;
  employeeName: string;
  locationId?: string;
  locationName: string;
  date: string;
  clockHours: number;
  billableHours: number;
  payHours: number;
  chargeHours: number;
  payAmount: number;
  chargeAmount: number;
  minPayApplied: boolean;
  minChargeApplied: boolean;
  usedFallbackRate: boolean;
  hasOvertime: boolean;
  missingSiteChargeCard?: boolean;
  isLeave?: boolean;
}

export interface AwardIncompleteSession {
  sessionKey: string;
  employeeId: string;
  employeeName: string;
  date: string;
  status: string;
}

export type AwardExceptionKind =
  | 'incomplete'
  | 'min_pay'
  | 'min_charge'
  | 'overtime'
  | 'fallback_rate'
  | 'missing_site_card';

export interface AwardException {
  kind: AwardExceptionKind;
  sessionKey: string;
  employeeDocId?: string;
  employeeName: string;
  date: string;
  locationName?: string;
  detail: string;
}

export interface AwardReport {
  slices: AwardSlice[];
  sessions: AwardSessionLine[];
  incompleteSessions: number;
  incomplete: AwardIncompleteSession[];
  totals: {
    payHours: number;
    chargeHours: number;
    payAmount: number;
    chargeAmount: number;
    margin: number;
  };
}

export interface AwardDateRange {
  start: string;
  end: string;
}

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundHours(value: number, rules: PayRules): number {
  if (rules.hoursRounding === 'none') return value;
  if (rules.hoursRounding === 'nearestMinutes') {
    const minutes = rules.nearestMinutes && rules.nearestMinutes > 0 ? rules.nearestMinutes : 15;
    const units = 60 / minutes;
    return Math.round(value * units) / units;
  }
  return Math.round(value * 100) / 100;
}

function hhmmToMinutes(value: string): number {
  if (value === '24:00' || value === '24:00:00') return 24 * 60;
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function bandContains(band: PayTimeBand, minuteOfDay: number): boolean {
  const from = hhmmToMinutes(band.from);
  const to = hhmmToMinutes(band.to);
  if (from === to) return false;
  if (from < to) return minuteOfDay >= from && minuteOfDay < to;
  return minuteOfDay >= from || minuteOfDay < to;
}

function resolveBandId(bands: PayTimeBand[], minuteOfDay: number): string {
  const match = bands.find((band) => bandContains(band, minuteOfDay));
  return match?.id ?? BASE_BAND_ID;
}

function weekdayInTimeZone(date: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  return WEEKDAY_SHORT[short] ?? 0;
}

function isPublicHoliday(
  rules: PayRules,
  date: string,
  locationId: string,
): boolean {
  return rules.publicHolidays.some((holiday) => {
    if (holiday.date !== date) return false;
    if (!holiday.locationIds || holiday.locationIds.length === 0) return true;
    return holiday.locationIds.includes(locationId);
  });
}

export function resolveDayType(
  rules: PayRules,
  date: string,
  weekday: number,
  locationId: string,
): PayDayType {
  const holidayType = rules.dayTypes.find((type) => type.publicHoliday);
  if (holidayType && isPublicHoliday(rules, date, locationId)) {
    return holidayType;
  }
  const byWeekday = rules.dayTypes.find(
    (type) => !type.publicHoliday && type.weekdays?.includes(weekday),
  );
  return byWeekday ?? rules.dayTypes[0]!;
}

function weekdayOfIsoDate(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)).getUTCDay();
}

export function weekStartIso(iso: string, weekStartsOn: number): string {
  const weekday = weekdayOfIsoDate(iso);
  const diff = (weekday - weekStartsOn + 7) % 7;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

function lookupCell(
  cells: PayRateCells | undefined,
  dayTypeId: string,
  bandId: string,
): PayRateCell | undefined {
  if (!cells) return undefined;
  return (
    cells[rateCellKey(dayTypeId, bandId)] ??
    cells[rateCellKey(dayTypeId, BASE_BAND_ID)] ??
    cells[rateCellKey('weekday', bandId)] ??
    cells[rateCellKey('weekday', BASE_BAND_ID)]
  );
}

function pickCard<T extends { effectiveFrom?: string }>(
  current: T | undefined,
  history: T[] | undefined,
  date: string,
): T | undefined {
  const cards = [...(history ?? []), ...(current ? [current] : [])].filter((card) =>
    cardActive(card.effectiveFrom, date),
  );
  if (cards.length === 0) return undefined;
  return cards.sort((a, b) => (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? ''))[0];
}

function eachIsoDate(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (cursor.getTime() <= last.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function resolveRate(cell: PayRateCell | undefined, baseRate: number): number {
  if (!cell) return baseRate;
  if (typeof cell.rate === 'number') return cell.rate;
  if (typeof cell.percent === 'number') return roundMoney(baseRate * (cell.percent / 100));
  return baseRate;
}

function firstNumber(...values: Array<number | null | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function cardActive(effectiveFrom: string | undefined, date: string): boolean {
  if (!effectiveFrom) return true;
  return date >= effectiveFrom;
}

interface ClockSlice {
  date: string;
  weekday: number;
  bandId: string;
  hours: number;
}

interface WorkSlice extends ClockSlice {
  sessionKey: string;
  employeeDocId: string;
  locationId: string;
  overtime: boolean;
}

function splitClock(
  start: Date,
  end: Date,
  timeZone: string,
  bands: PayTimeBand[],
): ClockSlice[] {
  const slices: ClockSlice[] = [];
  const endMs = end.getTime();
  let cursor = start.getTime();
  const stepMs = 60 * 1000;

  while (cursor < endMs) {
    const at = new Date(cursor);
    const date = toInputDateInTimeZone(timeZone, at);
    const minute = getMinutesInTimeZone(timeZone, at);
    const weekday = weekdayInTimeZone(at, timeZone);
    const bandId = resolveBandId(bands, minute);
    const next = Math.min(cursor + stepMs, endMs);
    const hours = (next - cursor) / 3_600_000;
    const last = slices[slices.length - 1];
    if (last && last.date === date && last.bandId === bandId) {
      last.hours += hours;
    } else {
      slices.push({ date, weekday, bandId, hours });
    }
    cursor = next;
  }

  return slices;
}

function inflateHours(slices: WorkSlice[], minimum: number): WorkSlice[] {
  if (minimum <= 0 || slices.length === 0) return slices;
  const total = slices.reduce((sum, slice) => sum + slice.hours, 0);
  if (total >= minimum) return slices;
  const extra = minimum - total;
  const copy = slices.map((slice) => ({ ...slice }));
  copy[copy.length - 1]!.hours += extra;
  return copy;
}

function inflateByDay(slices: WorkSlice[], minForGroup: (slice: WorkSlice) => number): WorkSlice[] {
  const groups = new Map<string, WorkSlice[]>();
  for (const slice of slices) {
    const key = `${slice.employeeDocId}|${slice.date}`;
    const list = groups.get(key) ?? [];
    list.push(slice);
    groups.set(key, list);
  }

  const result: WorkSlice[] = [];
  for (const group of groups.values()) {
    const minimum = minForGroup(group[0]!);
    result.push(...inflateHours(group, minimum));
  }
  return result;
}

function applyOvertime(slices: WorkSlice[], rules: PayRules): WorkSlice[] {
  const daily = rules.overtimeRules.filter((rule) => rule.scope === 'daily' && rule.thresholdHours > 0);
  const weekly = rules.overtimeRules.filter(
    (rule) => rule.scope === 'weekly' && rule.thresholdHours > 0,
  );

  const marked = slices.map((slice) => ({ ...slice, overtime: false }));

  for (const rule of daily) {
    const byDay = new Map<string, WorkSlice[]>();
    for (const slice of marked) {
      if (slice.overtime) continue;
      const key = `${slice.employeeDocId}|${slice.date}`;
      const list = byDay.get(key) ?? [];
      list.push(slice);
      byDay.set(key, list);
    }
    for (const daySlices of byDay.values()) {
      const remaining = daySlices.reduce((sum, slice) => sum + slice.hours, 0);
      if (remaining <= rule.thresholdHours) continue;
      let overflow = remaining - rule.thresholdHours;
      for (let index = daySlices.length - 1; index >= 0 && overflow > 0; index -= 1) {
        const slice = daySlices[index]!;
        const take = Math.min(slice.hours, overflow);
        if (take >= slice.hours) {
          slice.overtime = true;
          slice.bandId = OVERTIME_BAND_ID;
          overflow -= slice.hours;
        } else if (take > 0) {
          slice.hours -= take;
          marked.push({
            ...slice,
            hours: take,
            overtime: true,
            bandId: OVERTIME_BAND_ID,
          });
          overflow -= take;
        }
      }
    }
  }

  for (const rule of weekly) {
    const byWeek = new Map<string, WorkSlice[]>();
    for (const slice of marked) {
      if (slice.overtime) continue;
      const key = `${slice.employeeDocId}|${weekStartIso(slice.date, rules.weekStartsOn)}`;
      const list = byWeek.get(key) ?? [];
      list.push(slice);
      byWeek.set(key, list);
    }
    for (const weekSlices of byWeek.values()) {
      const total = weekSlices.reduce((sum, slice) => sum + slice.hours, 0);
      if (total <= rule.thresholdHours) continue;
      let overflow = total - rule.thresholdHours;
      const chronological = [...weekSlices].sort((a, b) => a.date.localeCompare(b.date));
      for (let index = chronological.length - 1; index >= 0 && overflow > 0; index -= 1) {
        const slice = chronological[index]!;
        const take = Math.min(slice.hours, overflow);
        if (take >= slice.hours) {
          slice.overtime = true;
          slice.bandId = OVERTIME_BAND_ID;
          overflow -= slice.hours;
        } else if (take > 0) {
          slice.hours -= take;
          marked.push({
            ...slice,
            hours: take,
            overtime: true,
            bandId: OVERTIME_BAND_ID,
          });
          overflow -= take;
        }
      }
    }
  }

  return marked.filter((slice) => slice.hours > 0.00001);
}

export function resolveSessionLocationId(input: {
  session: WorkSession;
  employee: Employee;
  sessionDate: string;
  shifts: Shift[];
}): string {
  const shift = input.shifts.find(
    (item) =>
      item.employeeId === input.employee.employeeId && item.date === input.sessionDate,
  );
  if (shift?.locationId) return shift.locationId;
  if (input.session.checkIn.locationId) return input.session.checkIn.locationId;
  return input.employee.locationId ?? '';
}

function inRange(date: string, range?: AwardDateRange): boolean {
  if (!range) return true;
  return date >= range.start && date <= range.end;
}

interface SessionMeta {
  sessionKey: string;
  employee: Employee;
  locationId: string;
  locationName: string;
  sessionDate: string;
  clockHours: number;
  billableHours: number;
  billing: SiteBilling | undefined;
  payRates: StaffPayRates | undefined;
  minPay: number;
  minCharge: number;
  hasSiteChargeCard: boolean;
}

function emptyTotals() {
  return { payHours: 0, chargeHours: 0, payAmount: 0, chargeAmount: 0, margin: 0 };
}

export function buildAwardReport(input: {
  rules: PayRules;
  timeZone: string;
  employees: Employee[];
  locations: Location[];
  sessions: WorkSession[];
  shifts?: Shift[];
  dateRange?: AwardDateRange;
  leaveRequests?: LeaveRequest[];
}): AwardReport {
  const { rules, timeZone, employees, locations, sessions } = input;
  const shifts = input.shifts ?? [];
  const employeeByCode = new Map(employees.map((item) => [item.employeeId, item]));
  const locationById = new Map(locations.map((item) => [item.id, item]));

  const complete = sessions.filter(
    (session) => session.status === 'complete' && session.checkOut && session.billableHours != null,
  );

  const paySlices: WorkSlice[] = [];
  const chargeSlices: WorkSlice[] = [];
  const metas = new Map<string, SessionMeta>();
  const incomplete: AwardIncompleteSession[] = [];

  for (const session of sessions) {
    const start = session.checkIn.timestampServer?.toDate();
    if (!start) continue;
    const sessionDate = toInputDateInTimeZone(timeZone, start);
    if (!inRange(sessionDate, input.dateRange)) continue;
    if (session.status !== 'complete' || !session.checkOut) {
      incomplete.push({
        sessionKey: session.checkIn.id,
        employeeId: session.checkIn.employeeId,
        employeeName: session.checkIn.employeeNameSnapshot || session.checkIn.employeeId,
        date: sessionDate,
        status: session.status,
      });
    }
  }

  for (const session of complete) {
    const employee = employeeByCode.get(session.checkIn.employeeId);
    if (!employee) continue;
    const start = session.checkIn.timestampServer?.toDate();
    const end = session.checkOut?.timestampServer?.toDate();
    if (!start || !end || end <= start) continue;

    const sessionDate = toInputDateInTimeZone(timeZone, start);
    if (!inRange(sessionDate, input.dateRange)) continue;

    const locationId = resolveSessionLocationId({
      session,
      employee,
      sessionDate,
      shifts,
    });
    const location = locationById.get(locationId);
    const billing = pickCard(location?.billing, location?.billingHistory, sessionDate);
    const bands = billing?.timeBands?.length ? billing.timeBands : rules.timeBands;

    const clockHours = (end.getTime() - start.getTime()) / 3_600_000;
    const billable = session.billableHours ?? clockHours;
    const factor = clockHours > 0 ? billable / clockHours : 1;
    const sessionKey = session.checkIn.id;
    const payRates = pickCard(employee.payRates, employee.payRateHistory, sessionDate);

    const minPay =
      firstNumber(
        payRates?.minPayHours,
        billing?.minPayHours,
        rules.minPayHours,
      ) ?? 0;
    const minCharge = firstNumber(billing?.minChargeHours, rules.minChargeHours) ?? 0;

    const clock = splitClock(start, end, timeZone, bands).map((slice) => ({
      ...slice,
      hours: slice.hours * factor,
      sessionKey,
      employeeDocId: employee.id,
      locationId,
      overtime: false,
    }));

    metas.set(sessionKey, {
      sessionKey,
      employee,
      locationId,
      locationName: location?.name ?? '',
      sessionDate,
      clockHours,
      billableHours: billable,
      billing,
      payRates,
      minPay,
      minCharge,
      hasSiteChargeCard: Boolean(billing?.cells && Object.keys(billing.cells).length > 0),
    });

    paySlices.push(...clock.map((slice) => ({ ...slice })));
    chargeSlices.push(...clock.map((slice) => ({ ...slice })));
  }

  const payBySession = new Map<string, WorkSlice[]>();
  for (const slice of paySlices) {
    const list = payBySession.get(slice.sessionKey) ?? [];
    list.push(slice);
    payBySession.set(slice.sessionKey, list);
  }
  const chargeBySession = new Map<string, WorkSlice[]>();
  for (const slice of chargeSlices) {
    const list = chargeBySession.get(slice.sessionKey) ?? [];
    list.push(slice);
    chargeBySession.set(slice.sessionKey, list);
  }

  let inflatedPay: WorkSlice[] = [];
  let inflatedCharge: WorkSlice[] = [];

  if (rules.minHoursScope === 'day') {
    inflatedPay = inflateByDay(
      paySlices,
      (slice) => metas.get(slice.sessionKey)?.minPay ?? 0,
    );
    inflatedCharge = inflateByDay(
      chargeSlices,
      (slice) => metas.get(slice.sessionKey)?.minCharge ?? 0,
    );
  } else {
    for (const [sessionKey, slices] of payBySession) {
      inflatedPay.push(...inflateHours(slices, metas.get(sessionKey)?.minPay ?? 0));
    }
    for (const [sessionKey, slices] of chargeBySession) {
      inflatedCharge.push(...inflateHours(slices, metas.get(sessionKey)?.minCharge ?? 0));
    }
  }

  const payByEmployee = new Map<string, WorkSlice[]>();
  for (const slice of inflatedPay) {
    const list = payByEmployee.get(slice.employeeDocId) ?? [];
    list.push(slice);
    payByEmployee.set(slice.employeeDocId, list);
  }
  const chargeByEmployee = new Map<string, WorkSlice[]>();
  for (const slice of inflatedCharge) {
    const list = chargeByEmployee.get(slice.employeeDocId) ?? [];
    list.push(slice);
    chargeByEmployee.set(slice.employeeDocId, list);
  }

  const payMarked: WorkSlice[] = [];
  const chargeMarked: WorkSlice[] = [];
  for (const slices of payByEmployee.values()) {
    payMarked.push(...applyOvertime(slices, rules));
  }
  for (const slices of chargeByEmployee.values()) {
    chargeMarked.push(...applyOvertime(slices, rules));
  }

  const priced = new Map<string, AwardSlice>();

  function sliceKey(slice: WorkSlice, dayTypeId: string, bandId: string): string {
    return `${slice.sessionKey}|${slice.date}|${dayTypeId}|${bandId}`;
  }

  function ensureSlice(
    slice: WorkSlice,
    meta: SessionMeta,
    dayTypeId: string,
    bandId: string,
  ): AwardSlice {
    const key = sliceKey(slice, dayTypeId, bandId);
    const existing = priced.get(key);
    if (existing) return existing;
    const created: AwardSlice = {
      employeeDocId: meta.employee.id,
      employeeId: meta.employee.employeeId,
      employeeName: meta.employee.name,
      department: meta.employee.department,
      employmentTypeId: meta.employee.employmentTypeId || 'employee',
      locationId: meta.locationId,
      locationName: meta.locationName,
      date: slice.date,
      sessionKey: slice.sessionKey,
      dayTypeId,
      bandId,
      overtime: slice.overtime,
      hours: 0,
      payHours: 0,
      chargeHours: 0,
      payRate: 0,
      chargeRate: 0,
      payAmount: 0,
      chargeAmount: 0,
    };
    priced.set(key, created);
    return created;
  }

  for (const slice of payMarked) {
    const meta = metas.get(slice.sessionKey);
    if (!meta) continue;
    const dayType = resolveDayType(rules, slice.date, slice.weekday, slice.locationId);
    const bandId = slice.overtime ? OVERTIME_BAND_ID : slice.bandId;
    const hours = roundHours(slice.hours, rules);
    const staffCell = lookupCell(meta.payRates?.cells, dayType.id, bandId);
    const companyCell = lookupCell(rules.defaultPayCells, dayType.id, bandId);
    const cell = staffCell ?? companyCell;
    const rate = resolveRate(cell, meta.employee.hourlyRate || 0);
    const amount = roundMoney(hours * rate);
    const row = ensureSlice(slice, meta, dayType.id, bandId);
    row.overtime = row.overtime || slice.overtime;
    row.hours = roundHours(row.hours + hours, rules);
    row.payHours = roundHours(row.payHours + hours, rules);
    row.payRate = rate;
    row.payAmount = roundMoney(row.payAmount + amount);
    if (!cell) row.usedFallbackRate = true;
  }

  for (const slice of chargeMarked) {
    const meta = metas.get(slice.sessionKey);
    if (!meta) continue;
    const dayType = resolveDayType(rules, slice.date, slice.weekday, slice.locationId);
    const bandId = slice.overtime ? OVERTIME_BAND_ID : slice.bandId;
    const hours = roundHours(slice.hours, rules);
    const basePay = meta.employee.hourlyRate || 0;
    const siteCell = lookupCell(meta.billing?.cells, dayType.id, bandId);
    const companyCharge = lookupCell(rules.defaultChargeCells, dayType.id, bandId);
    const weekdayBase = resolveRate(
      lookupCell(meta.billing?.cells, 'weekday', BASE_BAND_ID) ??
        lookupCell(rules.defaultChargeCells, 'weekday', BASE_BAND_ID),
      basePay,
    );
    const cell = siteCell ?? companyCharge;
    const rate = resolveRate(cell, weekdayBase || basePay);
    const amount = roundMoney(hours * rate);
    const row = ensureSlice(slice, meta, dayType.id, bandId);
    row.overtime = row.overtime || slice.overtime;
    row.chargeHours = roundHours(row.chargeHours + hours, rules);
    row.chargeRate = rate;
    row.chargeAmount = roundMoney(row.chargeAmount + amount);
  }

  const sessionLines: AwardSessionLine[] = [];

  for (const meta of metas.values()) {
    const sessionPriced = [...priced.values()].filter(
      (slice) => slice.sessionKey === meta.sessionKey,
    );
    let payHours = sessionPriced.reduce((sum, slice) => sum + slice.payHours, 0);
    let chargeHours = sessionPriced.reduce((sum, slice) => sum + slice.chargeHours, 0);
    let payAmount = sessionPriced.reduce((sum, slice) => sum + slice.payAmount, 0);
    let chargeAmount = sessionPriced.reduce((sum, slice) => sum + slice.chargeAmount, 0);

    for (const allowance of rules.allowances) {
      const qty = allowance.per === 'session' ? 1 : payHours;
      const amount = roundMoney(allowance.amount * qty);
      if (allowance.side === 'pay' || allowance.side === 'both') {
        payAmount = roundMoney(payAmount + amount);
      }
      if (allowance.side === 'charge' || allowance.side === 'both') {
        chargeAmount = roundMoney(chargeAmount + amount);
      }
    }

    sessionLines.push({
      sessionKey: meta.sessionKey,
      employeeDocId: meta.employee.id,
      employeeId: meta.employee.employeeId,
      employeeName: meta.employee.name,
      locationId: meta.locationId,
      locationName: meta.locationName,
      date: meta.sessionDate,
      clockHours: roundHours(meta.clockHours, rules),
      billableHours: roundHours(meta.billableHours, rules),
      payHours: roundHours(payHours, rules),
      chargeHours: roundHours(chargeHours, rules),
      payAmount: roundMoney(payAmount),
      chargeAmount: roundMoney(chargeAmount),
      minPayApplied: meta.minPay > 0 && payHours > meta.billableHours + 0.001,
      minChargeApplied: meta.minCharge > 0 && chargeHours > meta.billableHours + 0.001,
      usedFallbackRate: sessionPriced.some((slice) => slice.usedFallbackRate),
      hasOvertime: sessionPriced.some((slice) => slice.overtime),
      missingSiteChargeCard: !meta.hasSiteChargeCard,
    });
  }

  if (rules.payApprovedLeave) {
    const hoursPerDay = rules.paidLeaveHoursPerDay ?? 8;
    if (hoursPerDay > 0) {
      for (const leave of input.leaveRequests ?? []) {
        if (leave.status !== 'Approved') continue;
        const employee = employeeByCode.get(leave.employeeId);
        if (!employee) continue;
        const dates = eachIsoDate(leave.startDate, leave.endDate).filter((date) =>
          inRange(date, input.dateRange),
        );
        for (const date of dates) {
          const weekday = weekdayOfIsoDate(date);
          const locationId = employee.locationId ?? '';
          const dayType = resolveDayType(rules, date, weekday, locationId);
          const payRates = pickCard(employee.payRates, employee.payRateHistory, date);
          const cell =
            lookupCell(payRates?.cells, dayType.id, BASE_BAND_ID) ??
            lookupCell(rules.defaultPayCells, dayType.id, BASE_BAND_ID);
          const hours = roundHours(hoursPerDay, rules);
          const rate = resolveRate(cell, employee.hourlyRate || 0);
          const amount = roundMoney(hours * rate);
          const sessionKey = `leave-${leave.id}-${date}`;
          const location = locationById.get(locationId);
          priced.set(`${sessionKey}|${date}|${dayType.id}|${BASE_BAND_ID}`, {
            employeeDocId: employee.id,
            employeeId: employee.employeeId,
            employeeName: employee.name,
            department: employee.department,
            employmentTypeId: employee.employmentTypeId || 'employee',
            locationId,
            locationName: location?.name ?? '',
            date,
            sessionKey,
            dayTypeId: dayType.id,
            bandId: BASE_BAND_ID,
            overtime: false,
            hours,
            payHours: hours,
            chargeHours: 0,
            payRate: rate,
            chargeRate: 0,
            payAmount: amount,
            chargeAmount: 0,
            usedFallbackRate: !cell,
          });
          sessionLines.push({
            sessionKey,
            employeeDocId: employee.id,
            employeeId: employee.employeeId,
            employeeName: employee.name,
            locationId,
            locationName: location?.name ?? '',
            date,
            clockHours: 0,
            billableHours: hours,
            payHours: hours,
            chargeHours: 0,
            payAmount: amount,
            chargeAmount: 0,
            minPayApplied: false,
            minChargeApplied: false,
            usedFallbackRate: !cell,
            hasOvertime: false,
            isLeave: true,
          });
        }
      }
    }
  }

  const sessionTotals = sessionLines.reduce((acc, line) => {
    acc.payHours += line.payHours;
    acc.chargeHours += line.chargeHours;
    acc.payAmount += line.payAmount;
    acc.chargeAmount += line.chargeAmount;
    return acc;
  }, emptyTotals());

  return {
    slices: [...priced.values()].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.employeeName.localeCompare(b.employeeName);
    }),
    sessions: sessionLines.sort((a, b) => a.date.localeCompare(b.date)),
    incompleteSessions: incomplete.length,
    incomplete,
    totals: {
      payHours: roundHours(sessionTotals.payHours, rules),
      chargeHours: roundHours(sessionTotals.chargeHours, rules),
      payAmount: roundMoney(sessionTotals.payAmount),
      chargeAmount: roundMoney(sessionTotals.chargeAmount),
      margin: roundMoney(sessionTotals.chargeAmount - sessionTotals.payAmount),
    },
  };
}

export function groupAwardSlices(
  slices: AwardSlice[],
  groupBy: 'staff' | 'site' | 'date' | 'band' | 'employmentType',
): Array<{
  key: string;
  label: string;
  payHours: number;
  chargeHours: number;
  payAmount: number;
  chargeAmount: number;
  margin: number;
}> {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      payHours: number;
      chargeHours: number;
      payAmount: number;
      chargeAmount: number;
    }
  >();

  for (const slice of slices) {
    let key = '';
    let label = '';
    switch (groupBy) {
      case 'staff':
        key = slice.employeeDocId;
        label = `${slice.employeeName} (${slice.employeeId})`;
        break;
      case 'site':
        key = slice.locationId || 'none';
        label = slice.locationName || 'No site';
        break;
      case 'date':
        key = slice.date;
        label = slice.date;
        break;
      case 'band':
        key = `${slice.dayTypeId}:${slice.bandId}`;
        label = `${slice.dayTypeId} / ${slice.bandId}`;
        break;
      default:
        key = slice.employmentTypeId;
        label = slice.employmentTypeId;
    }
    const current = groups.get(key) ?? {
      key,
      label,
      payHours: 0,
      chargeHours: 0,
      payAmount: 0,
      chargeAmount: 0,
    };
    current.payHours += slice.payHours;
    current.chargeHours += slice.chargeHours;
    current.payAmount += slice.payAmount;
    current.chargeAmount += slice.chargeAmount;
    groups.set(key, current);
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      payHours: Math.round(row.payHours * 100) / 100,
      chargeHours: Math.round(row.chargeHours * 100) / 100,
      payAmount: roundMoney(row.payAmount),
      chargeAmount: roundMoney(row.chargeAmount),
      margin: roundMoney(row.chargeAmount - row.payAmount),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function filterAwardSlices(
  slices: AwardSlice[],
  filters: {
    locationId?: string;
    employeeDocId?: string;
    department?: string;
    employmentTypeId?: string;
  },
): AwardSlice[] {
  return slices.filter((slice) => {
    if (filters.locationId && slice.locationId !== filters.locationId) return false;
    if (filters.employeeDocId && slice.employeeDocId !== filters.employeeDocId) return false;
    if (filters.department && slice.department !== filters.department) return false;
    if (filters.employmentTypeId && slice.employmentTypeId !== filters.employmentTypeId) {
      return false;
    }
    return true;
  });
}

export function buildAwardExceptions(report: AwardReport): AwardException[] {
  const exceptions: AwardException[] = [];

  for (const item of report.incomplete) {
    exceptions.push({
      kind: 'incomplete',
      sessionKey: item.sessionKey,
      employeeName: item.employeeName,
      date: item.date,
      detail: 'No check-out — excluded from pay and charge',
    });
  }

  for (const line of report.sessions) {
    if (line.isLeave) continue;
    if (line.minPayApplied) {
      exceptions.push({
        kind: 'min_pay',
        sessionKey: line.sessionKey,
        employeeDocId: line.employeeDocId,
        employeeName: line.employeeName,
        date: line.date,
        locationName: line.locationName,
        detail: `Paid ${line.payHours.toFixed(2)}h (clock ${line.clockHours.toFixed(2)}h, billable ${line.billableHours.toFixed(2)}h)`,
      });
    }
    if (line.minChargeApplied) {
      exceptions.push({
        kind: 'min_charge',
        sessionKey: line.sessionKey,
        employeeDocId: line.employeeDocId,
        employeeName: line.employeeName,
        date: line.date,
        locationName: line.locationName,
        detail: `Charged ${line.chargeHours.toFixed(2)}h (billable ${line.billableHours.toFixed(2)}h)`,
      });
    }
    if (line.hasOvertime) {
      exceptions.push({
        kind: 'overtime',
        sessionKey: line.sessionKey,
        employeeDocId: line.employeeDocId,
        employeeName: line.employeeName,
        date: line.date,
        locationName: line.locationName,
        detail: 'Includes overtime hours',
      });
    }
    if (line.usedFallbackRate) {
      exceptions.push({
        kind: 'fallback_rate',
        sessionKey: line.sessionKey,
        employeeDocId: line.employeeDocId,
        employeeName: line.employeeName,
        date: line.date,
        locationName: line.locationName,
        detail: 'Used base hourly rate (no award cell)',
      });
    }
    if (line.missingSiteChargeCard) {
      exceptions.push({
        kind: 'missing_site_card',
        sessionKey: line.sessionKey,
        employeeDocId: line.employeeDocId,
        employeeName: line.employeeName,
        date: line.date,
        locationName: line.locationName,
        detail: `${line.locationName || 'Site'} has no charge rate card`,
      });
    }
  }

  return exceptions.sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName));
}

export function bandDisplayName(rules: PayRules, bandId: string): string {
  if (bandId === BASE_BAND_ID) return 'Base';
  if (bandId === OVERTIME_BAND_ID) return 'Overtime';
  return rules.timeBands.find((band) => band.id === bandId)?.name ?? bandId;
}

export function dayTypeDisplayName(rules: PayRules, dayTypeId: string): string {
  return rules.dayTypes.find((type) => type.id === dayTypeId)?.name ?? dayTypeId;
}
