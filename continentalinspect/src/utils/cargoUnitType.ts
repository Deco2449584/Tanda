import type { CargoInspection, CargoUnitType } from '@/types';
import { normalizeUldId } from '@/utils/uldId';

export const CARGO_UNIT_TYPES: readonly CargoUnitType[] = [
  'container',
  'uld_pallet',
  'loose_pallet',
] as const;

const CONTAINER_PREFIXES = new Set([
  'AKE',
  'AKH',
  'AKN',
  'AKC',
  'AAF',
  'ALF',
  'DPE',
  'DQP',
  'DLE',
  'RKN',
  'RAP',
  'ALP',
]);

const PALLET_PREFIXES = new Set(['PMC', 'PAG', 'PLA', 'PGA', 'FLA', 'P1P', 'PLB']);

const UNIT_TYPE_LABELS: Record<CargoUnitType, string> = {
  container: 'Container (AKE)',
  uld_pallet: 'ULD pallet (PMC)',
  loose_pallet: 'Loose pallet',
};

const UNIT_TYPE_HINTS: Record<CargoUnitType, string> = {
  container: 'Closed ULD — check doors, seal, and exterior condition.',
  uld_pallet: 'Airline pallet with net — check pallet serviceability and restraint.',
  loose_pallet: 'Cargo on a warehouse pallet — track by AWB, weight, and box count.',
};

export function getUnitTypeLabel(unitType: CargoUnitType): string {
  return UNIT_TYPE_LABELS[unitType];
}

export function getUnitTypeHint(unitType: CargoUnitType): string {
  return UNIT_TYPE_HINTS[unitType];
}

export function inferUnitTypeFromUldId(uldId: string): CargoUnitType | null {
  const normalized = normalizeUldId(uldId);
  if (!normalized) {
    return null;
  }

  const prefix = normalized.slice(0, 3);
  if (CONTAINER_PREFIXES.has(prefix)) {
    return 'container';
  }
  if (PALLET_PREFIXES.has(prefix)) {
    return 'uld_pallet';
  }

  return null;
}

export function resolveUnitType(
  unitType: string | undefined,
  uldId: string,
): CargoUnitType {
  if (unitType === 'container' || unitType === 'uld_pallet' || unitType === 'loose_pallet') {
    return unitType;
  }

  const inferred = inferUnitTypeFromUldId(uldId);
  if (inferred) {
    return inferred;
  }

  if (!normalizeUldId(uldId)) {
    return 'loose_pallet';
  }

  return 'container';
}

export function getInspectionDisplayTitle(inspection: CargoInspection): string {
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  if (unitType === 'loose_pallet' && !normalizeUldId(inspection.uldId)) {
    return `Loose pallet · AWB ${inspection.awbNumber}`;
  }

  return inspection.uldId;
}

export function requiresUldId(unitType: CargoUnitType): boolean {
  return unitType !== 'loose_pallet';
}
