import type { Timestamp } from 'firebase/firestore';

export interface LocationGroupFirestore {
  name: string;
  locationIds: string[];
  active: boolean;
  createdAt?: Timestamp;
}

export interface LocationGroup {
  id: string;
  name: string;
  locationIds: string[];
  active: boolean;
  createdAt?: string;
}

export interface CreateLocationGroupInput {
  name: string;
  locationIds: string[];
}

export interface UpdateLocationGroupInput {
  name: string;
  locationIds: string[];
}
