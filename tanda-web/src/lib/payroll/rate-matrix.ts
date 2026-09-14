import {
  BASE_BAND_ID,
  OVERTIME_BAND_ID,
  rateCellKey,
  type PayRateCell,
  type PayRateCells,
  type PayRules,
  type StaffPayRates,
} from '@/lib/types/pay-rules';

export interface RateMatrixRow {
  id: string;
  name: string;
}

export function rateMatrixRows(rules: PayRules): RateMatrixRow[] {
  return [
    { id: BASE_BAND_ID, name: 'Base' },
    ...rules.timeBands.map((band) => ({ id: band.id, name: band.name })),
    { id: OVERTIME_BAND_ID, name: 'Overtime' },
  ];
}

export function emptyRateCell(): PayRateCell {
  return {};
}

export function readRateCell(
  cells: PayRateCells | undefined,
  dayTypeId: string,
  bandId: string,
): PayRateCell {
  return cells?.[rateCellKey(dayTypeId, bandId)] ?? {};
}

export function writeRateCell(
  cells: PayRateCells | undefined,
  dayTypeId: string,
  bandId: string,
  cell: PayRateCell | null,
): PayRateCells {
  const next = { ...(cells ?? {}) };
  const key = rateCellKey(dayTypeId, bandId);
  if (!cell || (cell.rate === undefined && cell.percent === undefined)) {
    delete next[key];
  } else {
    next[key] = cell;
  }
  return next;
}

export function baseHourlyRateFromCells(
  cells: PayRateCells | undefined,
  fallback = 0,
): number {
  const cell = cells?.[rateCellKey('weekday', BASE_BAND_ID)];
  if (typeof cell?.rate === 'number') return cell.rate;
  return fallback;
}

/**
 * Staff override if set (> 0), otherwise the company default hourly rate.
 * Used as the $ base that % cells multiply against.
 */
export function effectiveHourlyRate(
  employeeHourlyRate: number | undefined,
  rules: Pick<PayRules, 'defaultHourlyRate'> | undefined,
): number {
  if (typeof employeeHourlyRate === 'number' && employeeHourlyRate > 0) {
    return employeeHourlyRate;
  }
  const company = rules?.defaultHourlyRate;
  return typeof company === 'number' && company > 0 ? company : 0;
}

export function applyHourlyRateToCells(
  cells: PayRateCells | undefined,
  hourlyRate: number,
): PayRateCells {
  return writeRateCell(cells, 'weekday', BASE_BAND_ID, { rate: hourlyRate });
}

/**
 * Keep the weekday/base matrix cell aligned with the top-level hourly rate.
 * Only sync when an explicit rate is set — syncing `0` (UI "Default") was
 * overwriting custom Base/$ matrix edits on save.
 */
export function withSyncedBaseRate(
  payRates: StaffPayRates | undefined,
  hourlyRate: number,
): StaffPayRates {
  if (!(hourlyRate > 0)) {
    return { ...(payRates ?? {}) };
  }
  return {
    ...payRates,
    cells: applyHourlyRateToCells(payRates?.cells, hourlyRate),
  };
}
