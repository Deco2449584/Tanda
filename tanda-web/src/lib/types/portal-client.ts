import type { Timestamp } from 'firebase/firestore';

export interface PortalClientFirestore {
  companyName: string;
  accessCode: string;
  pinHash: string;
  /** Plaintext PIN for admin display and copy — never exposed on the public portal. */
  pin?: string;
  active: boolean;
  createdAt?: Timestamp;
}

export interface PortalClient {
  id: string;
  companyName: string;
  accessCode: string;
  pin?: string;
  active: boolean;
  createdAt?: string;
}

export interface CreatePortalClientInput {
  companyName: string;
  accessCode: string;
  pin: string;
}
