import { DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';
import type { PayRules } from '@/lib/types/pay-rules';

export const DEFAULT_PAY_RULES: PayRules = {
  weekStartsOn: 1,
  hoursRounding: '2dp',
  nearestMinutes: 15,
  unscheduledLocation: 'employee',
  payApprovedLeave: false,
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
      expenseAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountCode,
      expenseAccountName: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountName,
      payableAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountCode,
      payableAccountName: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountName,
    },
    {
      id: 'contractor',
      label: 'Contractor',
      expenseAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesExpenseAccountCode,
      expenseAccountName: 'Contractor expense',
      payableAccountCode: DEFAULT_PAYROLL_ACCOUNTING.wagesPayableAccountCode,
      payableAccountName: 'Contractors payable',
    },
  ],
};
