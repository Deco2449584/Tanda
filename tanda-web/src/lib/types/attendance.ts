import type { Timestamp } from 'firebase/firestore';

export type AttendanceType = 'check_in' | 'check_out';

export interface AttendanceRecordFirestore {
  employeeId: string;
  employeeNameSnapshot: string;
  type: AttendanceType;
  timestampServer: Timestamp | null;
  photoUrl: string;
  source: string;
}

export interface AttendanceRecord extends AttendanceRecordFirestore {
  id: string;
}
