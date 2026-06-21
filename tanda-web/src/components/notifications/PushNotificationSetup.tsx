'use client';

import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/** Keeps push subscription synced on each device after permission is granted. */
export function PushNotificationSetup() {
  const { supported, permission, subscribed, loading, syncSubscription } =
    usePushNotifications();

  useEffect(() => {
    if (loading || !supported || subscribed) return;

    if (permission === 'granted') {
      void syncSubscription();
    }
  }, [loading, permission, subscribed, supported, syncSubscription]);

  return null;
}
