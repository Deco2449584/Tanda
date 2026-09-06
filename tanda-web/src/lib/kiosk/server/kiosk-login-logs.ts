import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { KioskLoginEvent, KioskLoginLog } from '@/lib/types/kiosk-context';
import type { KioskOperator } from '@/lib/kiosk/server/kiosk-operator';

const HISTORY_LIMIT = 40;

export async function recordKioskLoginEvent(input: {
  operator: KioskOperator;
  event: KioskLoginEvent;
  locationId?: string;
  locationName?: string;
  userAgent?: string;
}): Promise<void> {
  await getAdminFirestore().collection(COLLECTIONS.KIOSK_LOGIN_LOGS).add({
    kioskEmployeeDocId: input.operator.employeeDocId,
    kioskEmployeeName: input.operator.name,
    locationId: input.locationId ?? null,
    locationName: input.locationName ?? null,
    event: input.event,
    createdAt: FieldValue.serverTimestamp(),
    userAgent: input.userAgent?.slice(0, 240) ?? null,
  });
}

export async function listKioskLoginHistory(
  operator: KioskOperator,
): Promise<KioskLoginLog[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.KIOSK_LOGIN_LOGS)
    .where('kioskEmployeeDocId', '==', operator.employeeDocId)
    .get();

  return snapshot.docs
    .map((document) => {
      const data = document.data();
      const createdAt =
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : typeof data.createdAt === 'string'
            ? data.createdAt
            : new Date().toISOString();

      return {
        id: document.id,
        kioskEmployeeDocId: operator.employeeDocId,
        kioskEmployeeName:
          typeof data.kioskEmployeeName === 'string'
            ? data.kioskEmployeeName
            : operator.name,
        locationId:
          typeof data.locationId === 'string' && data.locationId.trim()
            ? data.locationId.trim()
            : undefined,
        locationName:
          typeof data.locationName === 'string' && data.locationName.trim()
            ? data.locationName.trim()
            : undefined,
        event:
          data.event === 'location_change'
            ? ('location_change' as const)
            : ('login' as const),
        createdAt,
        userAgent:
          typeof data.userAgent === 'string' && data.userAgent.trim()
            ? data.userAgent.trim()
            : undefined,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, HISTORY_LIMIT);
}
