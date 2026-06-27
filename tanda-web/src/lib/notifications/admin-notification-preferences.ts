import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  normalizeNotificationEmail,
  notificationPreferencesDocId,
} from '@/lib/notifications/normalize-email';

export async function getDismissedAdminAlertKeys(
  recipientEmail: string,
): Promise<string[]> {
  if (!db) return [];

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return [];

  const snapshot = await getDoc(
    doc(db, COLLECTIONS.NOTIFICATION_PREFERENCES, notificationPreferencesDocId(email)),
  );

  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  const keys = data.dismissedAdminAlertKeys;
  return Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : [];
}

export function subscribeToDismissedAdminAlertKeys(
  recipientEmail: string,
  onChange: (keys: string[]) => void,
): Unsubscribe {
  if (!db) {
    onChange([]);
    return () => undefined;
  }

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) {
    onChange([]);
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
        onChange([]);
        return;
      }

      const keys = snapshot.data().dismissedAdminAlertKeys;
      onChange(Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : []);
    },
    (error) => {
      console.error('subscribeToDismissedAdminAlertKeys', error);
      onChange([]);
    },
  );
}

export async function dismissAdminAlertKeys(
  recipientEmail: string,
  alertKeys: string[],
): Promise<void> {
  if (!db || alertKeys.length === 0) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  const existing = await getDismissedAdminAlertKeys(email);
  const merged = Array.from(new Set([...existing, ...alertKeys]));

  await setDoc(
    doc(db, COLLECTIONS.NOTIFICATION_PREFERENCES, notificationPreferencesDocId(email)),
    {
      recipientEmail: email,
      dismissedAdminAlertKeys: merged,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
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
      dismissedAdminAlertKeys: [],
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
