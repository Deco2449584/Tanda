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

export function applyHourlyRateToCells(
  cells: PayRateCells | undefined,
  hourlyRate: number,
): PayRateCells {
  return writeRateCell(cells, 'weekday', BASE_BAND_ID, { rate: hourlyRate });
}

export function withSyncedBaseRate(
  payRates: StaffPayRates | undefined,
  hourlyRate: number,
): StaffPayRates {
  return {
    ...payRates,
    cells: applyHourlyRateToCells(payRates?.cells, hourlyRate),
  };
}
