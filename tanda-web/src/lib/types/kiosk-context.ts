export interface KioskLocationOption {
  id: string;
  name: string;
  city: string;
}

export interface KioskContext {
  operatorEmployeeDocId: string;
  operatorName: string;
  operatorEmail: string;
  isKioskAccount: boolean;
  canChangeLocation: boolean;
  allowedLocations: KioskLocationOption[];
  defaultLocationId: string;
}

export type KioskLoginEvent = 'login' | 'location_change';

export interface KioskLoginLog {
  id: string;
  kioskEmployeeDocId: string;
  kioskEmployeeName: string;
  locationId?: string;
  locationName?: string;
  event: KioskLoginEvent;
  createdAt: string;
  userAgent?: string;
}
