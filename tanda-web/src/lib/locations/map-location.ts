import { Timestamp } from 'firebase/firestore';
import { normalizeAuLocationState } from '@/lib/locations/au-states';
import type { Location, LocationFirestore } from '@/lib/types/location';
import { mapSiteBilling } from '@/lib/payroll/map-pay-rules';

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

export function mapLocationDoc(
  id: string,
  data: Record<string, unknown>,
): Location {
  const record = data as Partial<LocationFirestore>;

  const code =
    typeof record.code === 'string' && record.code.trim()
      ? record.code.trim().toUpperCase()
      : undefined;

  return {
    id,
    name: record.name?.trim() ?? '',
    city: record.city?.trim() ?? '',
    state: normalizeAuLocationState(
      typeof record.state === 'string' ? record.state : undefined,
    ),
    code,
    photoUrl:
      typeof record.photoUrl === 'string' && record.photoUrl.trim()
        ? record.photoUrl.trim()
        : undefined,
    active: record.active !== false,
    pin:
      typeof record.pin === 'string' && record.pin.trim()
        ? record.pin.trim()
        : undefined,
    hasPortalPin:
      (typeof record.pinHash === 'string' && record.pinHash.length > 0) ||
      (typeof record.pin === 'string' && record.pin.trim().length > 0),
    scanPunchEnabled: record.scanPunchEnabled === true,
    scanPunchToken:
      typeof record.scanPunchToken === 'string' && record.scanPunchToken.trim()
        ? record.scanPunchToken.trim()
        : undefined,
    billing: mapSiteBilling(record.billing),
    billingHistory: Array.isArray(record.billingHistory)
      ? record.billingHistory
          .map((item) => mapSiteBilling(item))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
      : undefined,
    createdAt: timestampToIso(record.createdAt),
  };
}
