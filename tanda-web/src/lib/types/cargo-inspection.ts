export type ConservationType = 'Frozen' | 'Refrigerated' | 'Ambient';

export const CONSERVATION_TYPES: readonly ConservationType[] = [
  'Frozen',
  'Refrigerated',
  'Ambient',
] as const;

export type CargoInspectionStatus = 'new' | 'loaded';

export interface CargoInspectionFirestore {
  userId: string;
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
