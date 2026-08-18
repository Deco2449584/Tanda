import { DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';
import type {
  HoursRounding,
  MinHoursScope,
  PayAllowance,
  PayDayType,
  PayEmploymentType,
  PayOvertimeRule,
  PayPublicHoliday,
  PayRateCell,
  PayRateCells,
  PayRules,
  PayTimeBand,
  RateTemplate,
  SiteBilling,
  StaffPayRates,
} from '@/lib/types/pay-rules';
import { DEFAULT_PAY_RULES } from '@/lib/payroll/default-pay-rules';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function mapTimeBand(raw: unknown): PayTimeBand | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const name = asString(item.name);
  const from = asString(item.from);
  const to = asString(item.to);
  if (!id || !name || !from || !to) return null;
  return { id, name, from, to };
}

function mapDayType(raw: unknown): PayDayType | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const name = asString(item.name);
  if (!id || !name) return null;
  const weekdays = Array.isArray(item.weekdays)
    ? item.weekdays.filter((day): day is number => typeof day === 'number')
    : undefined;
  return {
    id,
    name,
    weekdays,
    publicHoliday: item.publicHoliday === true,
  };
}

function mapOvertimeRule(raw: unknown): PayOvertimeRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const scope = item.scope === 'weekly' || item.scope === 'daily' ? item.scope : null;
  const thresholdHours = asNumber(item.thresholdHours);
  const applyTo = asString(item.applyTo) ?? 'overtime';
  if (!id || !scope || thresholdHours === undefined) return null;
  return { id, scope, thresholdHours, applyTo };
}

function mapHoliday(raw: unknown): PayPublicHoliday | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const date = asString(item.date);
  if (!date) return null;
  const locationIds = Array.isArray(item.locationIds)
    ? item.locationIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
    : undefined;
  return { date, locationIds };
}

function mapAllowance(raw: unknown): PayAllowance | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const name = asString(item.name);
  const amount = asNumber(item.amount);
  if (!id || !name || amount === undefined) return null;
  return {
    id,
    name,
    amount,
    per: item.per === 'session' ? 'session' : 'hour',
    side: item.side === 'charge' || item.side === 'both' ? item.side : 'pay',
  };
}

function mapEmploymentType(
  raw: unknown,
  fallback: PayEmploymentType | undefined,
): PayEmploymentType | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const label = asString(item.label);
  if (!id || !label) return null;
  return {
    id,
    label,
    superPercent: asNumber(item.superPercent) ?? fallback?.superPercent,
    expenseAccountCode:
      asString(item.expenseAccountCode) ?? fallback?.expenseAccountCode,
    expenseAccountName:
      asString(item.expenseAccountName) ?? fallback?.expenseAccountName,
    payableAccountCode:
      asString(item.payableAccountCode) ?? fallback?.payableAccountCode,
    payableAccountName:
      asString(item.payableAccountName) ?? fallback?.payableAccountName,
  };
}

export function mapPayRateCells(raw: unknown): PayRateCells | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const cells: PayRateCells = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const cell = value as Record<string, unknown>;
    const mapped: PayRateCell = {};
    if (asNumber(cell.rate) !== undefined) mapped.rate = asNumber(cell.rate);
    if (asNumber(cell.percent) !== undefined) mapped.percent = asNumber(cell.percent);
    if (mapped.rate !== undefined || mapped.percent !== undefined) {
      cells[key] = mapped;
    }
  }
  return Object.keys(cells).length > 0 ? cells : undefined;
}

export function mapStaffPayRates(raw: unknown): StaffPayRates | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, unknown>;
  const minPayHours =
    item.minPayHours === null ? null : asNumber(item.minPayHours);
  return {
    effectiveFrom: asString(item.effectiveFrom),
    minPayHours,
    cells: mapPayRateCells(item.cells),
  };
}

export function mapSiteBilling(raw: unknown): SiteBilling | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const item = raw as Record<string, unknown>;
  const timeBands = Array.isArray(item.timeBands)
    ? item.timeBands.map(mapTimeBand).filter((band): band is PayTimeBand => Boolean(band))
    : undefined;
  return {
    effectiveFrom: asString(item.effectiveFrom),
    timeBands: timeBands && timeBands.length > 0 ? timeBands : undefined,
    minPayHours: item.minPayHours === null ? null : asNumber(item.minPayHours),
    minChargeHours:
      item.minChargeHours === null ? null : asNumber(item.minChargeHours),
    cells: mapPayRateCells(item.cells),
  };
}

function mapRateTemplate(raw: unknown): RateTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const id = asString(item.id);
  const name = asString(item.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    employmentTypeId: asString(item.employmentTypeId),
    cells: mapPayRateCells(item.cells),
    minPayHours: item.minPayHours === null ? null : asNumber(item.minPayHours),
  };
}

export function mapPayRules(
  raw: unknown,
  payrollAccounting?: {
    wagesExpenseAccountCode: string;
    wagesExpenseAccountName: string;
    wagesPayableAccountCode: string;
    wagesPayableAccountName: string;
  },
): PayRules {
  const gl = payrollAccounting ?? DEFAULT_PAYROLL_ACCOUNTING;
  const defaults: PayRules = {
    ...DEFAULT_PAY_RULES,
    employmentTypes: DEFAULT_PAY_RULES.employmentTypes.map((type) =>
      type.id === 'employee'
        ? {
            ...type,
            expenseAccountCode: gl.wagesExpenseAccountCode,
            expenseAccountName: gl.wagesExpenseAccountName,
            payableAccountCode: gl.wagesPayableAccountCode,
            payableAccountName: gl.wagesPayableAccountName,
          }
        : type,
    ),
  };

  if (!raw || typeof raw !== 'object') return defaults;
  const data = raw as Record<string, unknown>;

  const timeBands = Array.isArray(data.timeBands)
    ? data.timeBands.map(mapTimeBand).filter((band): band is PayTimeBand => Boolean(band))
    : defaults.timeBands;

  const dayTypes = Array.isArray(data.dayTypes)
    ? data.dayTypes.map(mapDayType).filter((item): item is PayDayType => Boolean(item))
    : defaults.dayTypes;

  const overtimeRules = Array.isArray(data.overtimeRules)
    ? data.overtimeRules
        .map(mapOvertimeRule)
        .filter((item): item is PayOvertimeRule => Boolean(item))
    : defaults.overtimeRules;

  const publicHolidays = Array.isArray(data.publicHolidays)
    ? data.publicHolidays
        .map(mapHoliday)
        .filter((item): item is PayPublicHoliday => Boolean(item))
    : defaults.publicHolidays;

  const allowances = Array.isArray(data.allowances)
    ? data.allowances
        .map(mapAllowance)
        .filter((item): item is PayAllowance => Boolean(item))
    : defaults.allowances;

  const employmentTypes = Array.isArray(data.employmentTypes)
    ? data.employmentTypes
        .map((item) =>
          mapEmploymentType(
            item,
            defaults.employmentTypes.find(
              (type) =>
                typeof item === 'object' &&
                item &&
                'id' in item &&
                type.id === (item as { id?: string }).id,
            ),
          ),
        )
        .filter((item): item is PayEmploymentType => Boolean(item))
    : defaults.employmentTypes;

  const rounding = data.hoursRounding;
  const hoursRounding: HoursRounding =
    rounding === 'none' || rounding === 'nearestMinutes' || rounding === '2dp'
      ? rounding
      : defaults.hoursRounding;

  const minHoursScope: MinHoursScope =
    data.minHoursScope === 'day' ? 'day' : 'session';

  return {
    weekStartsOn:
      typeof data.weekStartsOn === 'number' && data.weekStartsOn >= 0 && data.weekStartsOn <= 6
        ? data.weekStartsOn
        : defaults.weekStartsOn,
    hoursRounding,
    nearestMinutes: asNumber(data.nearestMinutes) ?? defaults.nearestMinutes,
    unscheduledLocation: 'employee',
    payApprovedLeave: asBool(data.payApprovedLeave) ?? defaults.payApprovedLeave,
    paidLeaveHoursPerDay:
      asNumber(data.paidLeaveHoursPerDay) ?? defaults.paidLeaveHoursPerDay ?? 8,
    timeBands: timeBands.length > 0 ? timeBands : defaults.timeBands,
    dayTypes: dayTypes.length > 0 ? dayTypes : defaults.dayTypes,
    overtimeRules,
    minPayHours: asNumber(data.minPayHours) ?? defaults.minPayHours,
    minChargeHours: asNumber(data.minChargeHours) ?? defaults.minChargeHours,
    minHoursScope,
    publicHolidays,
    allowances,
    employmentTypes:
      employmentTypes.length > 0 ? employmentTypes : defaults.employmentTypes,
    defaultPayCells: mapPayRateCells(data.defaultPayCells) ?? defaults.defaultPayCells,
    defaultChargeCells:
      mapPayRateCells(data.defaultChargeCells) ?? defaults.defaultChargeCells,
    rateTemplates: Array.isArray(data.rateTemplates)
      ? data.rateTemplates
          .map(mapRateTemplate)
          .filter((item): item is RateTemplate => Boolean(item))
      : defaults.rateTemplates ?? [],
    reportPresets: Array.isArray(data.reportPresets)
      ? data.reportPresets
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
          .map((item) => ({
            name: asString(item.name) ?? 'Preset',
            view: asString(item.view) ?? 'pay',
            groupBy: asString(item.groupBy) ?? 'staff',
            locationId: asString(item.locationId) ?? '',
            employeeDocId: asString(item.employeeDocId) ?? '',
            department: asString(item.department) ?? '',
            employmentTypeId: asString(item.employmentTypeId) ?? '',
          }))
      : defaults.reportPresets ?? [],
  };
}
