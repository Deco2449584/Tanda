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
  kioskDeviceLabelSnapshot?: string;
}

export interface AttendanceRecord extends AttendanceRecordFirestore {
  id: string;
}
