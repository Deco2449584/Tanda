export type CargoCountUnit =
  | 'boxes'
  | 'cartons'
  | 'pieces'
  | 'bags'
  | 'crates'
  | 'pallets'
  | 'units';

export const COUNT_UNITS: readonly CargoCountUnit[] = [
  'boxes',
  'cartons',
  'pieces',
  'bags',
  'crates',
  'pallets',
  'units',
] as const;

const COUNT_UNIT_LABELS: Record<CargoCountUnit, { singular: string; plural: string }> = {
  boxes: { singular: 'box', plural: 'boxes' },
  cartons: { singular: 'carton', plural: 'cartons' },
  pieces: { singular: 'piece', plural: 'pieces' },
  bags: { singular: 'bag', plural: 'bags' },
  crates: { singular: 'crate', plural: 'crates' },
  pallets: { singular: 'pallet', plural: 'pallets' },
  units: { singular: 'unit', plural: 'units' },
};

export function normalizeCountUnit(value: string | undefined): CargoCountUnit {
  const raw = value?.trim().toLowerCase();
  if (raw && COUNT_UNITS.includes(raw as CargoCountUnit)) {
    return raw as CargoCountUnit;
  }
  return 'boxes';
}

export function getCountUnitLabel(unit: CargoCountUnit, count = 2): string {
  const labels = COUNT_UNIT_LABELS[unit];
  return count === 1 ? labels.singular : labels.plural;
}

export function formatCountLabel(count: number, unit?: string): string {
  return `${count} ${getCountUnitLabel(normalizeCountUnit(unit), count)}`;
}
