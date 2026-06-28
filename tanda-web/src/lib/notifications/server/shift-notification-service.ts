import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  buildShiftNotificationContent,
  buildShiftNotificationDocId,
  type EmployeeShiftAlertType,
} from '@/lib/notifications/build-shift-notification';
import { isNotificationChannelEnabled } from '@/lib/notifications/notification-channels';
import { getNotificationChannelsForEmail } from '@/lib/notifications/server/notification-preferences';
import { isPushConfigured } from '@/lib/notifications/vapid';
import { sendPushNotification } from '@/lib/notifications/send-push';
import { isSystemPushEnabled } from '@/lib/notifications/server/system-push';

export async function upsertEmployeeShiftNotification(input: {
  recipientEmail: string;
  employeeDocId?: string;
  type: EmployeeShiftAlertType;
  shiftId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  pushSubscription?: string | null;
}): Promise<{ inApp: boolean; push: boolean }> {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  if (!recipientEmail || !input.shiftId.trim()) {
    return { inApp: false, push: false };
  }

  const content = buildShiftNotificationContent({
    type: input.type,
    shiftId: input.shiftId,
    date: input.date,
    startTime: input.startTime ?? '',
    endTime: input.endTime ?? '',
  });

  const channels = await getNotificationChannelsForEmail(recipientEmail);
  if (!isNotificationChannelEnabled(channels, content.type)) {
    return { inApp: false, push: false };
  }

  const docId = buildShiftNotificationDocId(
    recipientEmail,
    input.type,
    input.shiftId,
  );
  const ref = getAdminFirestore().collection(COLLECTIONS.NOTIFICATIONS).doc(docId);
  const existing = await ref.get();

  if (existing.exists && existing.data()?.dismissed !== true) {
    return { inApp: true, push: false };
  }

  await ref.set(
    {
      recipientEmail,
      audience: 'employee',
      type: content.type,
      title: content.title,
      body: content.body,
      href: content.href,
      read: false,
      dismissed: false,
      createdAt: FieldValue.serverTimestamp(),
      metadata: content.metadata,
    },
    { merge: true },
  );

  let push = false;
  const pushSubscription = input.pushSubscription?.trim();
  if (
    (await isSystemPushEnabled()) &&
    isPushConfigured() &&
    pushSubscription
  ) {
    const result = await sendPushNotification(pushSubscription, {
      title: content.title,
      body: content.body,
      url: content.href,
    });

    push = result.ok;

    if (!result.ok && result.expired && input.employeeDocId) {
      await getAdminFirestore()
        .collection(COLLECTIONS.EMPLOYEES)
        .doc(input.employeeDocId)
        .update({
          pushSubscription: FieldValue.delete(),
          notificationsEnabledAt: FieldValue.delete(),
        });
    }
  }

  return { inApp: true, push };
}
