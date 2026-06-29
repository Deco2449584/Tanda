import type { Timestamp } from 'firebase/firestore';

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export type LeaveRequestType =
  | 'Vacation'
  | 'Medical Leave'
  | 'Family Emergency'
  | 'Personal';

export interface LeaveRequestFirestore {
  employeeId: string;
  startDate: string;
  endDate: string;
  type: LeaveRequestType | string;
  justification: string;
  status: LeaveRequestStatus;
  createdAt?: Timestamp;
}

export interface LeaveRequest extends LeaveRequestFirestore {
  id: string;
}

export interface NewLeaveRequestInput {
  type: LeaveRequestType;
  startDate: string;
  endDate: string;
  justification: string;
}

export interface UpdateLeaveRequestInput {
  type?: LeaveRequestType | string;
  startDate?: string;
  endDate?: string;
  justification?: string;
  status?: LeaveRequestStatus;
}
