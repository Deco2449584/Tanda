import { Timestamp } from 'firebase/firestore';
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
    code,
    active: record.active !== false,
    billing: mapSiteBilling(record.billing),
    createdAt: timestampToIso(record.createdAt),
  };
}
