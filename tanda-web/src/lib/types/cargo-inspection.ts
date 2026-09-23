export interface DeleteCargoInspectionResult {
  id: string;
  uldId: string;
  awbNumber: string;
  photoCount: number;
  videoCount: number;
  storageFilesDeleted: number;
}

export type ConservationType = 'Frozen' | 'Refrigerated' | 'Ambient';

export const CONSERVATION_TYPES: readonly ConservationType[] = [
  'Frozen',
  'Refrigerated',
  'Ambient',
] as const;

export type CargoInspectionStatus = 'identification' | 'processed' | 'loaded';

/**
 * Warehouse cargo categories:
 * - uld: aircraft Unit Load Devices (AKE, PMC, …)
 * - pallet_skid: general cargo on ISPM-15 pallets/skids
 * - lcl: consolidated freight de-vanned in the warehouse
 * - loose_cargo: loose cartons / parcels
 * - breakbulk: oversized or special crates/machinery
 */
export type CargoUnitType =
  | 'uld'
  | 'pallet_skid'
  | 'lcl'
  | 'loose_cargo'
  | 'breakbulk';

export interface CargoInspectionFirestore {
  userId: string;
  unitType?: CargoUnitType | string;
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType | string;
  foodType: string;
  weightKg: number;
  boxCount: number;
  hasIssues: boolean;
  status?: CargoInspectionStatus | string;
  issueDescription: string;
  issueReportedAt?: string;
  photoEvidence: string[];
  videoEvidence: string[];
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  registeredAt: unknown;
  registeredAtIso?: string;
  updatedAt?: unknown;
  updatedAtIso?: string;
  dispatchedAt?: unknown;
  dispatchedAtIso?: string;
  portalEnabled?: boolean;
  portalClientId?: string;
  clientLocationId?: string;
  clientLocationName?: string;
  registeredLatitude?: number;
  registeredLongitude?: number;
  registeredAccuracyMeters?: number;
  registeredLocationAt?: string;
  registeredMapsUrl?: string;
  temperatureCelsius?: number;
  exitVehiclePlate?: string;
  driverName?: string;
  transportCompany?: string;
}

export interface CargoInspection {
  id: string;
  userId: string;
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
  issueReportedAt?: string;
  photoEvidence: string[];
  videoEvidence: string[];
  registeredAt: string;
  updatedAt?: string;
  dispatchedAt?: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  portalEnabled: boolean;
  portalClientId?: string;
  clientLocationId?: string;
  clientLocationName?: string;
  registeredLatitude?: number;
  registeredLongitude?: number;
  registeredAccuracyMeters?: number;
  registeredLocationAt?: string;
  registeredMapsUrl?: string;
  temperatureCelsius?: number;
  exitVehiclePlate?: string;
  driverName?: string;
  transportCompany?: string;
}

export type CargoInspectionFormInput = {
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType;
  foodType: string;
  weightKg: number;
  boxCount: number;
  hasIssues: boolean;
  issueDescription: string;
  photoEvidence: string[];
  videoEvidence: string[];
};

/** Full payload captured by the web intake form (mirrors the mobile app). */
export type CargoInspectionCreateInput = {
  unitType: CargoUnitType;
  uldId: string;
  awbNumber: string;
  conservationType: ConservationType;
  foodType: string;
  weightKg: number;
  boxCount: number;
  hasIssues: boolean;
  issueDescription: string;
  clientLocationId: string;
  clientLocationName: string;
  temperatureCelsius?: number;
  exitVehiclePlate: string;
  driverName: string;
  transportCompany: string;
};

export const EMPTY_CARGO_INSPECTION_CREATE_INPUT: CargoInspectionCreateInput = {
  unitType: 'pallet_skid',
  uldId: '',
  awbNumber: '',
  conservationType: 'Ambient',
  foodType: '',
  weightKg: 0,
  boxCount: 0,
  hasIssues: false,
  issueDescription: '',
  clientLocationId: '',
  clientLocationName: '',
  exitVehiclePlate: '',
  driverName: '',
  transportCompany: '',
};
