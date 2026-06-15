import type { Timestamp } from 'firebase/firestore';

export interface PortalClientFirestore {
  companyName: string;
  accessCode: string;
  pinHash: string;
  active: boolean;
  createdAt?: Timestamp;
}

export interface PortalClient {
  id: string;
  companyName: string;
  accessCode: string;
  active: boolean;
  createdAt?: string;
}

export interface CreatePortalClientInput {
  companyName: string;
  accessCode: string;
  pin: string;
}
