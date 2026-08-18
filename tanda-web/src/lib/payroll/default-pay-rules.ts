import { DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';
import {
  rateCellKey,
  type PayRateCells,
  type PayRules,
} from '@/lib/types/pay-rules';

function percentCells(
  grid: Record<string, Record<string, number>>,
): PayRateCells {
  const cells: PayRateCells = {};
  for (const [dayTypeId, bands] of Object.entries(grid)) {
    for (const [bandId, percent] of Object.entries(bands)) {
      cells[rateCellKey(dayTypeId, bandId)] = { percent };
    }
  }
  return cells;
}

/** Starting loadings for Holly to edit. Percent of the staff hourly rate. */
const DEFAULT_PAY_CELLS = percentCells({
  weekday: { base: 100, early_morning: 125, afternoon: 125, overtime: 150 },
  saturday: { base: 150, early_morning: 175, afternoon: 175, overtime: 200 },
  sunday: { base: 200, early_morning: 225, afternoon: 225, overtime: 250 },
  public_holiday: { base: 250, early_morning: 250, afternoon: 250, overtime: 250 },
});

/**
 * Starting charge loadings for Holly to edit.
 * Percent of the staff hourly rate is first converted to a "weekday base" charge,
 * then the cell percent applies on top of that weekday charge.
 *
 * Defaults are intentionally non-empty so the UI and reports show figures;
 * Holly can adjust them to match the real award/customer rates.
 */
const DEFAULT_CHARGE_CELLS = percentCells({
  weekday: { base: 150, early_morning: 125, afternoon: 125, overtime: 150 },
  saturday: { base: 150, early_morning: 175, afternoon: 175, overtime: 200 },
  sunday: { base: 200, early_morning: 225, afternoon: 225, overtime: 250 },
  public_holiday: { base: 250, early_morning: 250, afternoon: 250, overtime: 250 },
});

export const DEFAULT_PAY_RULES: PayRules = {
  weekStartsOn: 1,
  hoursRounding: '2dp',
  nearestMinutes: 15,
  unscheduledLocation: 'employee',
  payApprovedLeave: false,
  paidLeaveHoursPerDay: 8,
  timeBands: [
    { id: 'early_morning', name: 'Early morning', from: '00:00', to: '06:00' },
    { id: 'afternoon', name: 'Afternoon', from: '18:00', to: '24:00' },
  ],
  dayTypes: [
    { id: 'weekday', name: 'Monday to Friday', weekdays: [1, 2, 3, 4, 5] },
    { id: 'saturday', name: 'Saturday', weekdays: [6] },
    { id: 'sunday', name: 'Sunday', weekdays: [0] },
    { id: 'public_holiday', name: 'Public holiday', publicHoliday: true },
  ],
  overtimeRules: [
    { id: 'ot_daily', scope: 'daily', thresholdHours: 8, applyTo: 'overtime' },
    { id: 'ot_weekly', scope: 'weekly', thresholdHours: 38, applyTo: 'overtime' },
  ],
  minPayHours: 4,
  minChargeHours: 4,
  minHoursScope: 'session',
  publicHolidays: [],
  allowances: [],
  employmentTypes: [
    {
      id: 'employee',
      label: 'Employee',
      superPercent: 12,
      expenseAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountCode,
      expenseAccountName: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountName,
      payableAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountCode,
      payableAccountName: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountName,
    },
    {
      id: 'contractor',
      label: 'Contractor',
      superPercent: 12,
      expenseAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountCode,
      expenseAccountName: 'Contractor expense',
      payableAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountCode,
      payableAccountName: 'Contractors payable',
    },
  ],
  defaultPayCells: DEFAULT_PAY_CELLS,
  defaultChargeCells: DEFAULT_CHARGE_CELLS,
};
