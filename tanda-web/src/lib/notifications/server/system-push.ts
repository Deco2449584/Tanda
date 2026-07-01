import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { DEFAULT_COMPANY_SETTINGS } from '@/lib/types/company-settings';

export async function isSystemPushEnabled(): Promise<boolean> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc('general')
    .get();

  if (!snapshot.exists) {
    return DEFAULT_COMPANY_SETTINGS.pushNotificationsEnabled !== false;
  }

  const value = snapshot.data()?.pushNotificationsEnabled;
  if (typeof value === 'boolean') {
    return value;
  }

  return DEFAULT_COMPANY_SETTINGS.pushNotificationsEnabled !== false;
}

export async function isShiftEmailEnabled(): Promise<boolean> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc('general')
    .get();

  if (!snapshot.exists) {
    return DEFAULT_COMPANY_SETTINGS.shiftEmailNotificationsEnabled === true;
  }

  return snapshot.data()?.shiftEmailNotificationsEnabled === true;
}

export async function clearAllEmployeePushSubscriptions(): Promise<number> {
  const firestore = getAdminFirestore();
  const snapshot = await firestore.collection(COLLECTIONS.EMPLOYEES).get();
  let cleared = 0;

  const batchSize = 400;
  let batch = firestore.batch();
  let batchCount = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    if (typeof data.pushSubscription !== 'string' || !data.pushSubscription.trim()) {
      continue;
    }

    batch.update(document.ref, {
      pushSubscription: FieldValue.delete(),
      notificationsEnabledAt: FieldValue.delete(),
    });
    cleared += 1;
    batchCount += 1;

    if (batchCount >= batchSize) {
      await batch.commit();
      batch = firestore.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return cleared;
}
