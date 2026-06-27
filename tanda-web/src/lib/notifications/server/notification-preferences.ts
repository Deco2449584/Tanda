import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import {
  normalizeNotificationEmail,
  notificationPreferencesDocId,
} from '@/lib/notifications/normalize-email';

export async function getNotificationChannelsForEmail(
  recipientEmail: string,
): Promise<NotificationChannelPreferences> {
  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) {
    return mapNotificationChannels(null);
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.NOTIFICATION_PREFERENCES)
    .doc(notificationPreferencesDocId(email))
    .get();

  if (!snapshot.exists) {
    return mapNotificationChannels(null);
  }

  const channels = snapshot.data()?.channels;
  return mapNotificationChannels(
    channels && typeof channels === 'object'
      ? (channels as Partial<NotificationChannelPreferences>)
      : null,
  );
}
