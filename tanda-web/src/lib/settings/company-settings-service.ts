import { doc, getDoc, setDoc } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import {
  DEFAULT_ATTENDANCE_BREAK,
  DEFAULT_COMPANY_SETTINGS,
  type AttendanceBreakSettings,
  type CompanySettings,
} from '@/lib/types/company-settings';
import { db } from '@/lib/firebase';

const SETTINGS_DOC_ID = 'general';

function mapAttendanceBreak(data: Record<string, unknown>): AttendanceBreakSettings {
  const raw = data.attendanceBreak;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ATTENDANCE_BREAK;
  }

  const breakData = raw as Record<string, unknown>;
  return {
    enabled:
      typeof breakData.enabled === 'boolean'
        ? breakData.enabled
        : DEFAULT_ATTENDANCE_BREAK.enabled,
    durationMinutes:
      typeof breakData.durationMinutes === 'number' && breakData.durationMinutes > 0
        ? breakData.durationMinutes
        : DEFAULT_ATTENDANCE_BREAK.durationMinutes,
    minShiftHours:
      typeof breakData.minShiftHours === 'number' && breakData.minShiftHours > 0
        ? breakData.minShiftHours
        : DEFAULT_ATTENDANCE_BREAK.minShiftHours,
  };
}

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
    attendanceBreak: mapAttendanceBreak(data),
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
      attendanceBreak: settings.attendanceBreak,
    },
    { merge: true },
  );
}
