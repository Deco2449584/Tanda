export type HoursRounding = 'none' | '2dp' | 'nearestMinutes';
export type MinHoursScope = 'session' | 'day';
export type OvertimeScope = 'daily' | 'weekly';
export type AllowancePer = 'hour' | 'session';
export type AllowanceSide = 'pay' | 'charge' | 'both';

export interface PayTimeBand {
  id: string;
  name: string;
  from: string;
  to: string;
}

export interface PayDayType {
  id: string;
  name: string;
  weekdays?: number[];
  publicHoliday?: boolean;
}

export interface PayOvertimeRule {
  id: string;
  scope: OvertimeScope;
  thresholdHours: number;
  applyTo: string;
}

export interface PayPublicHoliday {
  date: string;
  locationIds?: string[];
}

export interface PayAllowance {
  id: string;
  name: string;
  amount: number;
  per: AllowancePer;
  side: AllowanceSide;
}

export interface PayEmploymentType {
  id: string;
  label: string;
  superPercent?: number;
  expenseAccountCode?: string;
  expenseAccountName?: string;
  payableAccountCode?: string;
  payableAccountName?: string;
}

export interface PayRateCell {
  rate?: number;
  percent?: number;
}

export type PayRateCells = Record<string, PayRateCell>;

export interface StaffPayRates {
  effectiveFrom?: string;
  minPayHours?: number | null;
  cells?: PayRateCells;
}

export interface SiteBilling {
  effectiveFrom?: string;
  timeBands?: PayTimeBand[];
  minPayHours?: number | null;
  minChargeHours?: number | null;
  cells?: PayRateCells;
}

export interface PayRules {
  weekStartsOn: number;
  hoursRounding: HoursRounding;
  nearestMinutes?: number;
  unscheduledLocation: 'employee';
  payApprovedLeave: boolean;
  timeBands: PayTimeBand[];
  dayTypes: PayDayType[];
  overtimeRules: PayOvertimeRule[];
  minPayHours: number;
  minChargeHours: number;
  minHoursScope: MinHoursScope;
  publicHolidays: PayPublicHoliday[];
  allowances: PayAllowance[];
  employmentTypes: PayEmploymentType[];
}

export function rateCellKey(dayTypeId: string, bandId: string): string {
  return `${dayTypeId}:${bandId}`;
}

export const BASE_BAND_ID = 'base';
export const OVERTIME_BAND_ID = 'overtime';
