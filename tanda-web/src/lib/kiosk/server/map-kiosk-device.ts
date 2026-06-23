import type { Timestamp } from 'firebase-admin/firestore';
import type { KioskDevice, KioskDeviceStatus } from '@/lib/types/kiosk-device';

function timestampToIso(value: Timestamp | undefined): string | undefined {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

export function mapKioskDeviceDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
): KioskDevice {
  return {
    id,
    status: (data.status as KioskDeviceStatus) ?? 'pending',
    label: typeof data.label === 'string' ? data.label : undefined,
    locationId: typeof data.locationId === 'string' ? data.locationId : undefined,
    requestedAt: timestampToIso(data.requestedAt as Timestamp) ?? new Date().toISOString(),
    approvedAt: timestampToIso(data.approvedAt as Timestamp),
    approvedBy: typeof data.approvedBy === 'string' ? data.approvedBy : undefined,
    lastSeenAt: timestampToIso(data.lastSeenAt as Timestamp),
    userAgent: typeof data.userAgent === 'string' ? data.userAgent : undefined,
    platform: typeof data.platform === 'string' ? data.platform : undefined,
  };
}
