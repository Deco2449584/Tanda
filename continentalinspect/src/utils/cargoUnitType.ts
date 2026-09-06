import type { CargoInspection, CargoUnitType } from '@/types';
import { normalizeUldId } from '@/utils/uldId';

export const CARGO_UNIT_TYPES: readonly CargoUnitType[] = [
  'uld',
  'pallet_skid',
  'lcl',
  'loose_cargo',
  'breakbulk',
] as const;

/** Manual choices when there is no recognized ULD code. */
export const MANUAL_UNIT_TYPES: readonly CargoUnitType[] = [
  'lcl',
  'pallet_skid',
  'loose_cargo',
  'breakbulk',
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
  uld: 'ULD',
  pallet_skid: 'Pallet / Skid',
  lcl: 'LCL',
  loose_cargo: 'Loose cargo',
  breakbulk: 'Breakbulk',
};

const UNIT_TYPE_HINTS: Record<CargoUnitType, string> = {
  uld: 'Aircraft Unit Load Device (container or pallet shaped for the fuselage). Check exterior, seal, and serviceability.',
  pallet_skid:
    'General cargo on ISPM-15 wood pallets or skids, usually film-wrapped or strapped.',
  lcl: 'Consolidated freight from multiple shippers, de-vanned in the warehouse.',
  loose_cargo: 'Individual cartons or parcels for sort, label, or pick & pack.',
  breakbulk: 'Oversized or special cargo — crates, machinery, or pieces that do not fit a standard unit.',
};

const LEGACY_UNIT_TYPE_MAP: Record<string, CargoUnitType> = {
  uld: 'uld',
  pallet_skid: 'pallet_skid',
  lcl: 'lcl',
  loose_cargo: 'loose_cargo',
  breakbulk: 'breakbulk',
  // Legacy values from earlier app versions
  container: 'uld',
  uld_pallet: 'uld',
  loose_pallet: 'pallet_skid',
  skid: 'pallet_skid',
};

export function getUnitTypeLabel(unitType: CargoUnitType): string {
  return UNIT_TYPE_LABELS[unitType];
}

export function getUnitTypeHint(unitType: CargoUnitType): string {
  return UNIT_TYPE_HINTS[unitType];
}

/** First 3 letters of a normalized ULD id, if present. */
export function getUldPrefix(uldId: string): string | null {
  const normalized = normalizeUldId(uldId);
  if (normalized.length < 3) {
    return null;
  }
  const prefix = normalized.slice(0, 3);
  return /^[A-Z0-9]{3}$/.test(prefix) ? prefix : null;
}

/** Finer label when a ULD prefix is known (container vs airline pallet). */
export function getUldKindLabel(uldId: string): string | null {
  const prefix = getUldPrefix(uldId);
  if (!prefix) return null;
  if (CONTAINER_PREFIXES.has(prefix)) return 'Container ULD';
  if (PALLET_PREFIXES.has(prefix)) return 'Pallet ULD';
  return null;
}

export function inferUnitTypeFromUldId(uldId: string): CargoUnitType | null {
  const prefix = getUldPrefix(uldId);
  if (!prefix) {
    return null;
  }

  if (CONTAINER_PREFIXES.has(prefix) || PALLET_PREFIXES.has(prefix)) {
    return 'uld';
  }

  return null;
}

export function isManualUnitType(unitType: CargoUnitType): boolean {
  return unitType !== 'uld';
}

export function normalizeCargoUnitType(value: string | undefined): CargoUnitType | null {
  if (!value) return null;
  return LEGACY_UNIT_TYPE_MAP[value] ?? null;
}

export function resolveUnitType(
  unitType: string | undefined,
  uldId: string,
): CargoUnitType {
  const inferred = inferUnitTypeFromUldId(uldId);
  if (inferred) {
    return inferred;
  }

  const normalized = normalizeCargoUnitType(unitType);
  if (normalized && normalized !== 'uld') {
    return normalized;
  }

  // Stored as uld but no recognizable code anymore — fall back to pallet/skid.
  if (normalized === 'uld') {
    return 'pallet_skid';
  }

  return 'pallet_skid';
}

export function getInspectionDisplayTitle(inspection: CargoInspection): string {
  const unitType = resolveUnitType(inspection.unitType, inspection.uldId);
  if (isManualUnitType(unitType) && !normalizeUldId(inspection.uldId)) {
    return `${getUnitTypeLabel(unitType)} · AWB ${inspection.awbNumber}`;
  }

  return inspection.uldId || `${getUnitTypeLabel(unitType)} · AWB ${inspection.awbNumber}`;
}

export function requiresUldId(unitType: CargoUnitType): boolean {
  return unitType === 'uld';
}
