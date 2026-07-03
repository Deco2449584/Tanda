import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  type DismissedAdminAlertsMap,
  parseDismissedAdminAlerts,
} from '@/lib/notifications/admin-notification-dismiss';
import {
  normalizeNotificationEmail,
  notificationPreferencesDocId,
} from '@/lib/notifications/normalize-email';

export interface AdminAlertDismissInput {
  id: string;
  count: number;
  dateKey?: string;
}

async function readPreferencesDoc(email: string) {
  if (!db) return null;

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.NOTIFICATION_PREFERENCES, notificationPreferencesDocId(email)),
  );

  return snapshot.exists() ? snapshot.data() : null;
}

export async function getDismissedAdminAlerts(
  recipientEmail: string,
  todayKey: string,
): Promise<DismissedAdminAlertsMap> {
  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return {};

  const data = await readPreferencesDoc(email);
  return parseDismissedAdminAlerts(data ?? undefined, todayKey);
}

export function subscribeToDismissedAdminAlerts(
  recipientEmail: string,
  todayKey: string,
  onChange: (dismissed: DismissedAdminAlertsMap) => void,
): Unsubscribe {
  if (!db) {
    onChange({});
    return () => undefined;
  }

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) {
    onChange({});
    return () => undefined;
  }

  const ref = doc(
    db,
    COLLECTIONS.NOTIFICATION_PREFERENCES,
    notificationPreferencesDocId(email),
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange({});
        return;
      }

      onChange(parseDismissedAdminAlerts(snapshot.data(), todayKey));
    },
    (error) => {
      console.error('subscribeToDismissedAdminAlerts', error);
      onChange({});
    },
  );
}

export async function dismissAdminAlerts(
  recipientEmail: string,
  alerts: AdminAlertDismissInput[],
): Promise<void> {
  if (!db || alerts.length === 0) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  const todayKey =
    alerts.find((alert) => alert.dateKey)?.dateKey ??
    alerts[0]?.dateKey ??
    undefined;

  const existing = await getDismissedAdminAlerts(
    email,
    todayKey ?? new Date().toISOString().slice(0, 10),
  );
  const merged: DismissedAdminAlertsMap = { ...existing };

  for (const alert of alerts) {
    const previous = merged[alert.id];
    const nextSnapshot = {
      count: Math.max(previous?.count ?? 0, alert.count),
      ...(alert.dateKey ? { dateKey: alert.dateKey } : {}),
    };

    if (previous?.dateKey && !nextSnapshot.dateKey) {
      nextSnapshot.dateKey = previous.dateKey;
    }

    merged[alert.id] = nextSnapshot;
  }

  await setDoc(
    doc(db, COLLECTIONS.NOTIFICATION_PREFERENCES, notificationPreferencesDocId(email)),
    {
      recipientEmail: email,
      dismissedAdminAlerts: merged,
      dismissedAdminAlertKeys: [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** @deprecated Use dismissAdminAlerts with count snapshots. */
export async function dismissAdminAlertKeys(
  recipientEmail: string,
  alertKeys: string[],
): Promise<void> {
  if (alertKeys.length === 0) return;

  await dismissAdminAlerts(
    recipientEmail,
    alertKeys.map((id) => ({
      id,
      count: Number.MAX_SAFE_INTEGER,
    })),
  );
}

export async function clearDismissedAdminAlertKeys(recipientEmail: string): Promise<void> {
  if (!db) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  await setDoc(
    doc(db, COLLECTIONS.NOTIFICATION_PREFERENCES, notificationPreferencesDocId(email)),
    {
      recipientEmail: email,
      dismissedAdminAlerts: {},
      dismissedAdminAlertKeys: [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
