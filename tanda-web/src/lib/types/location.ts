import type { Timestamp } from 'firebase/firestore';
import type { SiteBilling } from '@/lib/types/pay-rules';

export interface LocationFirestore {
  name: string;
  city: string;
  code?: string;
  active: boolean;
  /** Plaintext PIN for admin display and copy — never exposed on the public portal. */
  pin?: string;
  pinHash?: string;
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
  pin?: string;
  /** True when pinHash (or plaintext pin) is stored — eligible for portal assignment. */
  hasPortalPin?: boolean;
  billing?: SiteBilling;
  billingHistory?: SiteBilling[];
  createdAt?: string;
}

export interface CreateLocationInput {
  name: string;
  city: string;
  code?: string;
  /** Required for new clients — 6–8 digit portal PIN. */
  pin: string;
}

export interface UpdateLocationInput {
  name: string;
  city: string;
  code?: string;
}
