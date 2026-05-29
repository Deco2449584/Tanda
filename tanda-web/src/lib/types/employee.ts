import type { Timestamp } from 'firebase/firestore';

export interface EmployeeFirestore {
  name: string;
  email: string;
  department: string;
  hourlyRate: number;
  active: boolean;
  lastAction: string;
  lastTimestampServer?: Timestamp;
}

export interface Employee extends EmployeeFirestore {
  id: string;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  department: string;
  hourlyRate: number;
}
