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
  createdByEmail?: string;
  createdByUid?: string;
  lastEditedByEmail?: string;
  lastEditedByUid?: string;
  lastEditedAt?: Timestamp;
}

export interface AttendanceRecord extends AttendanceRecordFirestore {
  id: string;
}
