import type { Timestamp } from 'firebase/firestore';

export type LeaveRequestStatus = 'Pendiente' | 'Aprobado' | 'Rechazado';

export type LeaveRequestType =
  | 'Vacaciones'
  | 'Permiso Médico'
  | 'Calamidad Doméstica'
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
