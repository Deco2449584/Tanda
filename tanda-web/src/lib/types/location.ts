import type { Timestamp } from 'firebase/firestore';
import type { SiteBilling } from '@/lib/types/pay-rules';

export interface LocationFirestore {
  name: string;
  city: string;
  code?: string;
  active: boolean;
  billing?: SiteBilling;
  billingHistory?: SiteBilling[];
  createdAt?: Timestamp;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  code?: string;
  active: boolean;
  billing?: SiteBilling;
  billingHistory?: SiteBilling[];
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
