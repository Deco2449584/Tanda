import { doc, getDoc, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/lib/types/company-settings';
import { db } from '@/lib/firebase';

const SETTINGS_DOC_ID = 'general';

function mapFirestoreData(data: Record<string, unknown>): CompanySettings {
  return {
    timeZone:
      typeof data.timeZone === 'string'
        ? data.timeZone
        : DEFAULT_COMPANY_SETTINGS.timeZone,
    currency:
      typeof data.currency === 'string'
        ? data.currency
        : DEFAULT_COMPANY_SETTINGS.currency,
  };
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  if (!db) return DEFAULT_COMPANY_SETTINGS;

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
  );

  if (!snapshot.exists()) {
    return DEFAULT_COMPANY_SETTINGS;
  }

  return mapFirestoreData(snapshot.data() as Record<string, unknown>);
}

export async function saveCompanySettings(
  settings: CompanySettings,
): Promise<void> {
  if (!db) {
    throw new Error('Firebase is not available.');
  }

  await setDoc(
    doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
    {
      timeZone: settings.timeZone,
      currency: settings.currency,
    },
    { merge: true },
  );
}
