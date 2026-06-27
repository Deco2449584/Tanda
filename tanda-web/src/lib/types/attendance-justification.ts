import type { Timestamp } from 'firebase/firestore';

export type AttendanceJustificationType = 'late' | 'no_show';

export type AttendanceJustificationStatus =
  | 'awaiting_employee'
  | 'pending'
  | 'approved'
  | 'rejected';

export interface AttendanceJustificationFirestore {
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  shiftId: string;
  date: string;
  shiftStartTime: string;
  shiftEndTime: string;
  type: AttendanceJustificationType;
  reason: string;
  status: AttendanceJustificationStatus;
  lateMinutes?: number;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedByEmail?: string;
  reviewerNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceJustification {
  id: string;
  employeeId: string;
  employeeEmail: string;
  employeeName: string;
  shiftId: string;
  date: string;
  shiftStartTime: string;
  shiftEndTime: string;
  type: AttendanceJustificationType;
  reason: string;
  status: AttendanceJustificationStatus;
  lateMinutes?: number;
  submittedAt?: number;
  reviewedAt?: number;
  reviewedByEmail?: string;
  reviewerNote?: string;
  createdAt: number;
  updatedAt: number;
}
