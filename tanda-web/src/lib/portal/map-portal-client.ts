import { Timestamp } from 'firebase/firestore';
import type { PortalClient, PortalClientFirestore } from '@/lib/types/portal-client';

function timestampToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return undefined;
}

export function mapPortalClientDoc(
  id: string,
  data: Record<string, unknown>,
): PortalClient {
  const record = data as Partial<PortalClientFirestore>;

  return {
    id,
    companyName: record.companyName?.trim() ?? '',
    accessCode: record.accessCode?.trim() ?? '',
    pin: typeof record.pin === 'string' && record.pin.trim() ? record.pin.trim() : undefined,
    active: record.active !== false,
    createdAt: timestampToIso(record.createdAt),
  };
}
