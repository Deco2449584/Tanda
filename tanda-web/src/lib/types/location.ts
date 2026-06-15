import type { Timestamp } from 'firebase/firestore';

export interface LocationFirestore {
  name: string;
  city: string;
  code?: string;
  active: boolean;
  createdAt?: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  code?: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateLocationInput {
  name: string;
  city: string;
  code?: string;
}

export interface UpdateLocationInput {
  name: string;
  city: string;
  code?: string;
}
