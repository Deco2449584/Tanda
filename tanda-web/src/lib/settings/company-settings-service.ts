import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { COLLECTIONS } from '@/lib/constants';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/lib/types/company-settings';
import { db, storage } from '@/lib/firebase';

const SETTINGS_DOC_ID = 'general';
const LOGO_STORAGE_PATH = 'settings/logo.png';

function mapFirestoreData(data: Record<string, unknown>): CompanySettings {
  return {
    companyName:
      typeof data.companyName === 'string'
        ? data.companyName
        : DEFAULT_COMPANY_SETTINGS.companyName,
    logoUrl:
      typeof data.logoUrl === 'string' ? data.logoUrl : DEFAULT_COMPANY_SETTINGS.logoUrl,
    primaryColor:
      typeof data.primaryColor === 'string'
        ? data.primaryColor
        : DEFAULT_COMPANY_SETTINGS.primaryColor,
    secondaryColor:
      typeof data.secondaryColor === 'string'
        ? data.secondaryColor
        : DEFAULT_COMPANY_SETTINGS.secondaryColor,
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
      companyName: settings.companyName.trim(),
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      timeZone: settings.timeZone,
      currency: settings.currency,
    },
    { merge: true },
  );
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage is not available.');
  }

  const storageRef = ref(storage, LOGO_STORAGE_PATH);
  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/png',
  });

  return getDownloadURL(storageRef);
}

