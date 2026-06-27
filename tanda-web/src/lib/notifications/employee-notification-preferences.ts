import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import {
  mapNotificationChannels,
  type NotificationChannelPreferences,
} from '@/lib/notifications/notification-channels';
import {
  normalizeNotificationEmail,
  notificationPreferencesDocId,
} from '@/lib/notifications/normalize-email';

function preferencesRef(email: string) {
  return doc(
    db!,
    COLLECTIONS.NOTIFICATION_PREFERENCES,
    notificationPreferencesDocId(email),
  );
}

export function subscribeToNotificationChannels(
  recipientEmail: string,
  onChange: (channels: NotificationChannelPreferences) => void,
): Unsubscribe {
  if (!db) {
    onChange(mapNotificationChannels(null));
    return () => undefined;
  }

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) {
    onChange(mapNotificationChannels(null));
    return () => undefined;
  }

  return onSnapshot(
    preferencesRef(email),
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(mapNotificationChannels(null));
        return;
      }

      const channels = snapshot.data().channels;
      onChange(
        mapNotificationChannels(
          channels && typeof channels === 'object'
            ? (channels as Partial<NotificationChannelPreferences>)
            : null,
        ),
      );
    },
    (error) => {
      console.error('subscribeToNotificationChannels', error);
      onChange(mapNotificationChannels(null));
    },
  );
}

export async function saveNotificationChannels(
  recipientEmail: string,
  channels: NotificationChannelPreferences,
): Promise<void> {
  if (!db) return;

  const email = normalizeNotificationEmail(recipientEmail);
  if (!email) return;

  await setDoc(
    preferencesRef(email),
    {
      recipientEmail: email,
      channels: mapNotificationChannels(channels),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
