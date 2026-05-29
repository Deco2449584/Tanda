import type { Timestamp } from 'firebase/firestore';

export interface EmployeeFirestore {
  employeeId: string;
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
  employeeId: string;
  name: string;
  email: string;
  department: string;
  hourlyRate: number;
}
