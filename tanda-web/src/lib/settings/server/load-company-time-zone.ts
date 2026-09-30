import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { DEFAULT_COMPANY_SETTINGS } from '@/lib/types/company-settings';

export async function loadCompanyTimeZone(): Promise<string> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc('general')
    .get();
  const timeZone = snapshot.data()?.timeZone;
  return typeof timeZone === 'string' && timeZone.trim()
    ? timeZone.trim()
    : DEFAULT_COMPANY_SETTINGS.timeZone;
}
