export type ConservationType = 'Frozen' | 'Refrigerated' | 'Ambient';

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
  photoEvidence: string[];
  videoEvidence: string[];
  createdBy: string;
  registeredAt: unknown;
  registeredAtIso?: string;
  updatedAt?: unknown;
  updatedAtIso?: string;
}

export interface CargoInspection {
  id: string;
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
  registeredAt: string;
  updatedAt?: string;
  createdBy: string;
}
