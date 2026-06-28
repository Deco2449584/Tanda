import type { Timestamp } from 'firebase/firestore';

export interface DepartmentFirestore {
  name: string;
  active: boolean;
  createdAt?: Timestamp;
}

export interface Department {
  id: string;
  name: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateDepartmentInput {
  name: string;
}

export interface UpdateDepartmentInput {
  name: string;
}
