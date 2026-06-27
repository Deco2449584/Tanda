import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  buildShiftNotificationContent,
  buildShiftNotificationDocId,
  shiftTypeToNotificationType,
  type EmployeeShiftAlertType,
} from '@/lib/notifications/build-shift-notification';
import {
  isNotificationChannelEnabled,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import {
  clearEmployeeShiftAlerts,
  loadEmployeeShiftAlerts,
} from '@/lib/notifications/employee-shift-alerts';
import { mapNotificationDoc } from '@/lib/notifications/map-notification';
import { normalizeNotificationEmail } from '@/lib/notifications/normalize-email';
import type { AppNotification } from '@/lib/types/notification';

const MAX_NOTIFICATIONS = 50;

export async function createShiftNotification(input: {
  recipientEmail: string;
  type: EmployeeShiftAlertType;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  channels?: NotificationChannelPreferences;
}): Promise<AppNotification | null> {
  if (!db) return null;

  const recipientEmail = normalizeNotificationEmail(input.recipientEmail);
  if (!recipientEmail) return null;

  const content = buildShiftNotificationContent(input);

  if (
    input.channels &&
    !isNotificationChannelEnabled(input.channels, content.type)
  ) {
    return null;
  }
  const docId = buildShiftNotificationDocId(recipientEmail, input.type, input.shiftId);
  const ref = doc(db, COLLECTIONS.NOTIFICATIONS, docId);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    if (data?.dismissed !== true) {
      return mapNotificationDoc(existing.id, data);
    }
  }

  const payload = {
    recipientEmail,
    audience: 'employee' as const,
    type: content.type,
    title: content.title,
    body: content.body,
    href: content.href,
    read: false,
    dismissed: false,
    createdAt: serverTimestamp(),
    metadata: content.metadata,
  };

  await setDoc(ref, payload, { merge: true });

  const saved = await getDoc(ref);
  if (!saved.exists()) return null;
  return mapNotificationDoc(saved.id, saved.data());
}

export function subscribeToEmployeeNotifications(
  recipientEmail: string,
  onChange: (notifications: AppNotification[]) => void,
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

  const notificationsQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('recipientEmail', '==', email),
    where('audience', '==', 'employee'),
    where('dismissed', '==', false),
    orderBy('createdAt', 'desc'),
    limit(MAX_NOTIFICATIONS),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((document) => mapNotificationDoc(document.id, document.data())),
      );
    },
    (error) => {
      console.error('subscribeToEmployeeNotifications', error);
      onChange([]);
    },
  );
}

export async function markEmployeeNotificationRead(notificationId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), { read: true });
}

export async function markAllEmployeeNotificationsRead(
  recipientEmail: string,
): Promise<void> {
  if (!db) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('recipientEmail', '==', email),
      where('audience', '==', 'employee'),
      where('dismissed', '==', false),
      where('read', '==', false),
      limit(MAX_NOTIFICATIONS),
    ),
  );

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { read: true });
  });
  await batch.commit();
}

export async function dismissAllEmployeeNotifications(
  recipientEmail: string,
): Promise<void> {
  if (!db) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('recipientEmail', '==', email),
      where('audience', '==', 'employee'),
      where('dismissed', '==', false),
      limit(MAX_NOTIFICATIONS),
    ),
  );

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((document) => {
    batch.update(document.ref, { dismissed: true, read: true });
  });
  await batch.commit();
}

export async function migrateLocalShiftAlertsToFirestore(input: {
  recipientEmail: string;
  employeeCode: string;
}): Promise<void> {
  if (!db) return;

  const email = normalizeNotificationEmail(input.recipientEmail);
  const employeeCode = input.employeeCode.trim();
  if (!email || !employeeCode) return;

  const legacyAlerts = loadEmployeeShiftAlerts(employeeCode);
  if (legacyAlerts.length === 0) return;

  await Promise.all(
    legacyAlerts.map(async (alert) => {
      const type: EmployeeShiftAlertType =
        alert.type === 'cancelled' ? 'cancelled' : 'assigned';
      const ref = doc(
        db!,
        COLLECTIONS.NOTIFICATIONS,
        buildShiftNotificationDocId(email, type, alert.shiftId),
      );
      const existing = await getDoc(ref);
      if (existing.exists()) return;

      await setDoc(ref, {
        recipientEmail: email,
        audience: 'employee',
        type: shiftTypeToNotificationType(type),
        title: alert.title,
        body: alert.description,
        href: alert.href,
        read: alert.read,
        dismissed: false,
        createdAt: serverTimestamp(),
        metadata: { shiftId: alert.shiftId, migratedFromLocal: true },
      });
    }),
  );

  clearEmployeeShiftAlerts(employeeCode);
}
