import type { Timestamp } from 'firebase-admin/firestore';
import type {
  KioskDevice,
  KioskDeviceDetails,
  KioskDeviceStatus,
  KioskDeviceType,
} from '@/lib/types/kiosk-device';

function timestampToIso(value: Timestamp | undefined): string | undefined {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

function mapStatus(value: unknown): KioskDeviceStatus {
  if (value === 'revoked') return 'revoked';
  if (value === 'pending') return 'pending';
  return 'active';
}

function mapDetails(value: unknown): KioskDeviceDetails | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;

  const details: KioskDeviceDetails = {};
  if (typeof data.browser === 'string') details.browser = data.browser;
  if (typeof data.os === 'string') details.os = data.os;
  if (typeof data.model === 'string') details.model = data.model;
  if (typeof data.platform === 'string') details.platform = data.platform;
  if (typeof data.mobile === 'boolean') details.mobile = data.mobile;
  if (typeof data.screen === 'string') details.screen = data.screen;
  if (typeof data.language === 'string') details.language = data.language;
  if (typeof data.timeZone === 'string') details.timeZone = data.timeZone;
  if (typeof data.userAgent === 'string') details.userAgent = data.userAgent;

  return Object.keys(details).length > 0 ? details : undefined;
}

export function mapKioskDeviceDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
): KioskDevice {
  return {
    id,
    status: mapStatus(data.status),
    type: (data.type as KioskDeviceType) === 'mobile' ? 'mobile' : 'tablet',
    name: typeof data.name === 'string' ? data.name : '',
    locationId: typeof data.locationId === 'string' ? data.locationId : '',
    hasLockPin: typeof data.lockPinHash === 'string' && data.lockPinHash.length > 0,
    details: mapDetails(data.details),
    clientSessionId:
      typeof data.clientSessionId === 'string'
        ? data.clientSessionId
        : id,
    ownerEmail:
      typeof data.ownerEmail === 'string'
        ? data.ownerEmail
        : typeof data.createdBy === 'string'
          ? data.createdBy
          : undefined,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    createdAt: timestampToIso(data.createdAt as Timestamp) ?? new Date().toISOString(),
    lastSeenAt: timestampToIso(data.lastSeenAt as Timestamp),
  };
}
