export type ConservationType = 'Frozen' | 'Refrigerated' | 'Ambient';

export const CONSERVATION_TYPES: readonly ConservationType[] = [
  'Frozen',
  'Refrigerated',
  'Ambient',
] as const;

const LEGACY_CONSERVATION_MAP: Record<string, ConservationType> = {
  Congelado: 'Frozen',
  Refrigerado: 'Refrigerated',
  Ambiente: 'Ambient',
  Frozen: 'Frozen',
  Refrigerated: 'Refrigerated',
  Ambient: 'Ambient',
};

/** Maps Firestore values (including legacy Spanish) to current English enums. */
export function normalizeConservationType(value: string | undefined): ConservationType {
  if (!value) return 'Ambient';
  const trimmed = value.trim();
  return LEGACY_CONSERVATION_MAP[trimmed] ?? 'Ambient';
}

export type CargoInspectionStatus = 'new' | 'loaded';

/**
 * Warehouse cargo categories:
 * - uld: aircraft Unit Load Devices (AKE, PMC, …)
 * - pallet_skid: general cargo on ISPM-15 pallets/skids
 * - lcl: consolidated freight de-van'd in warehouse
 * - loose_cargo: loose cartons / parcels
 * - breakbulk: oversized or special crates/machinery
 */
export type CargoUnitType =
  | 'uld'
  | 'pallet_skid'
  | 'lcl'
  | 'loose_cargo'
  | 'breakbulk';

export type InspectionSyncStatus = 'synced' | 'pending' | 'error';

export interface CargoInspection {
  id: string;
  unitType: CargoUnitType;
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType;
  foodType: string;
  weightKg: number;
  boxCount: number;
  status: CargoInspectionStatus;
  hasIssues: boolean;
  issueDescription?: string;
  photoEvidence: string[];
  videoEvidence: string[];
  registeredAt: Date | string;
  updatedAt?: Date | string;
  /** When the cargo was marked on the transport truck. */
  dispatchedAt?: Date | string;
  createdBy: string;
  syncStatus?: InspectionSyncStatus;
}

export type NewCargoInspectionInput = Omit<
  CargoInspection,
  'id' | 'status' | 'registeredAt' | 'updatedAt' | 'createdBy'
>;

export type UpdateCargoInspectionInput = NewCargoInspectionInput;

/** Default form / draft values for a new cargo inspection. */
export const EMPTY_CARGO_INSPECTION_INPUT: NewCargoInspectionInput = {
  unitType: 'pallet_skid',
  uldId: '',
  awbNumber: '',
  conservationType: 'Ambient',
  foodType: '',
  weightKg: 0,
  boxCount: 0,
  hasIssues: false,
  issueDescription: '',
  photoEvidence: [],
  videoEvidence: [],
};
