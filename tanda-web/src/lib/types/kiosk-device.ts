import type { Timestamp } from 'firebase/firestore';

export type KioskDeviceStatus = 'pending' | 'active' | 'revoked';

export interface KioskDeviceFirestore {
  status: KioskDeviceStatus;
  deviceTokenHash: string;
  label?: string;
  locationId?: string;
  requestedAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  lastSeenAt?: Timestamp;
  userAgent?: string;
  platform?: string;
}

export interface KioskDevice {
  id: string;
  status: KioskDeviceStatus;
  label?: string;
  locationId?: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  lastSeenAt?: string;
  userAgent?: string;
  platform?: string;
}

export interface KioskDeviceSession {
  deviceId: string;
  status: KioskDeviceStatus;
  locationId?: string;
  locationName?: string;
  locationCity?: string;
  label?: string;
  shortCode: string;
}
