import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import {
  deriveEmployeePresence,
  presenceVersionFromEmployeeData,
  resolveAttendanceAction,
  type AttendanceActionRecord,
} from '@/lib/attendance/resolve-attendance-action';
import { loadCompanySettingsAdmin } from '@/lib/attendance/server/validate-attendance-restrictions';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

const RECORD_LOOKBACK_DAYS = 90;

function lookbackTimestamp(): Timestamp {
  const since = new Date();
  since.setDate(since.getDate() - RECORD_LOOKBACK_DAYS);
  since.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(since);
}

export async function loadEmployeeAttendanceActionRecords(
  employeeCode: string,
): Promise<AttendanceActionRecord[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.ATTENDANCE_RECORDS)
    .where('employeeId', '==', employeeCode.trim())
    .where('timestampServer', '>=', lookbackTimestamp())
    .get();

  return snapshot.docs
    .map((document) => mapAttendanceDoc(document.id, document.data()))
    .filter((record) => record.timestampServer != null)
    .map((record) => ({
      type: record.type,
      timestampMs: record.timestampServer!.toMillis(),
    }));
}

export async function resolveNextAttendanceAction(
  employeeCode: string,
): Promise<'check_in' | 'check_out'> {
  const [settings, records] = await Promise.all([
    loadCompanySettingsAdmin(),
    loadEmployeeAttendanceActionRecords(employeeCode),
  ]);

  return resolveAttendanceAction({
    records,
    timeZone: settings.timeZone,
  });
}

export async function reconcileEmployeePresenceByCode(
  employeeCode: string,
): Promise<void> {
  const cleanCode = employeeCode.trim();
  if (!cleanCode) return;

  const employeeSnapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('employeeId', '==', cleanCode)
    .limit(1)
    .get();

  if (employeeSnapshot.empty) return;

  const employeeDoc = employeeSnapshot.docs[0]!;
  await reconcileEmployeePresence(employeeDoc.id, cleanCode);
}

export async function reconcileEmployeePresence(
  employeeDocId: string,
  employeeCode: string,
): Promise<void> {
  const [settings, records] = await Promise.all([
    loadCompanySettingsAdmin(),
    loadEmployeeAttendanceActionRecords(employeeCode),
  ]);

  const presence = deriveEmployeePresence({
    records,
    timeZone: settings.timeZone,
  });

  const update: Record<string, unknown> = {
    lastAction: presence.lastAction,
  };

  if (presence.lastTimestampMs != null) {
    update.lastTimestampServer = Timestamp.fromMillis(presence.lastTimestampMs);
  } else {
    update.lastTimestampServer = FieldValue.delete();
  }

  await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeDocId)
    .update(update);
}

export { presenceVersionFromEmployeeData };
