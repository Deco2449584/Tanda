import type { Timestamp } from 'firebase/firestore';

export type KioskDeviceStatus = 'pending' | 'active' | 'revoked';
export type KioskDeviceType = 'tablet' | 'mobile';

/** Best-effort hardware/software fingerprint captured on activation. */
export interface KioskDeviceDetails {
  browser?: string;
  os?: string;
  model?: string;
  platform?: string;
  mobile?: boolean;
  screen?: string;
  language?: string;
  timeZone?: string;
  userAgent?: string;
}

export interface KioskDeviceFirestore {
  status: KioskDeviceStatus;
  type: KioskDeviceType;
  name: string;
  deviceTokenHash: string;
  locationId: string;
  lockPinHash?: string;
  details?: KioskDeviceDetails;
  /** Stable id for this browser tab (also used as the Firestore document id). */
  clientSessionId?: string;
  /** Account that owns this browser session (used to group and revoke by user). */
  ownerEmail?: string;
  createdBy?: string;
  createdAt: Timestamp;
  lastSeenAt?: Timestamp;
}

export interface KioskDevice {
  id: string;
  status: KioskDeviceStatus;
  type: KioskDeviceType;
  name: string;
  locationId: string;
  hasLockPin: boolean;
  details?: KioskDeviceDetails;
  clientSessionId?: string;
  ownerEmail?: string;
  createdBy?: string;
  createdAt: string;
  lastSeenAt?: string;
}

/** Lightweight view returned to the kiosk client. */
export interface KioskDeviceSession {
  deviceId: string;
  status: KioskDeviceStatus;
  type: KioskDeviceType;
  name: string;
  locationId: string;
  locationName?: string;
  locationCity?: string;
  /** Tablet devices run in locked fullscreen mode and require a PIN to exit. */
  locked: boolean;
}
