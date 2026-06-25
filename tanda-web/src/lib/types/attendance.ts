import type { Timestamp } from 'firebase/firestore';

export type AttendanceType = 'check_in' | 'check_out';

export interface AttendanceRecordFirestore {
  employeeId: string;
  employeeNameSnapshot: string;
  employeeEmailSnapshot?: string;
  type: AttendanceType;
  timestampServer: Timestamp | null;
  photoUrl: string;
  photoPath?: string;
  photoCaptured?: boolean;
  source: string;
  locationId?: string;
  locationNameSnapshot?: string;
  locationCitySnapshot?: string;
  kioskDeviceId?: string;
  kioskDeviceNameSnapshot?: string;
  kioskDeviceType?: 'tablet' | 'mobile';
  latitude?: number;
  longitude?: number;
  geoAccuracy?: number;
  geoCapturedAt?: string;
  geoAddress?: string;
  breakWaived?: boolean;
}

export interface AttendanceRecord extends AttendanceRecordFirestore {
  id: string;
}
