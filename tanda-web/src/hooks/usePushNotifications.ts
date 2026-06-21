'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>;

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

async function getAuthHeaders(): Promise<HeadersInit | null> {
  const user = auth?.currentUser;
  if (!user) return null;

  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export function usePushNotifications() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(vapidPublicKey);

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshSubscriptionState = useCallback(async () => {
    if (!supported) {
      setPermission('unsupported');
      setSubscribed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      setPermission(Notification.permission);

      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        setSubscribed(false);
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(Boolean(subscription));
    } catch {
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [supported]);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

  const enable = useCallback(async () => {
    if (!supported || busy) return;

    setBusy(true);
    setError('');

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setError('Notification permission was not granted.');
        setSubscribed(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const headers = await getAuthHeaders();
      if (!headers) {
        setError('You must be signed in to enable notifications.');
        return;
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Could not enable notifications.');
      }

      setSubscribed(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not enable notifications.';
      setError(message);
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [busy, supported, vapidPublicKey]);

  const disable = useCallback(async () => {
    if (!supported || busy) return;

    setBusy(true);
    setError('');

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        await subscription.unsubscribe();
      }

      const headers = await getAuthHeaders();
      if (headers) {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers,
        });
      }

      setSubscribed(false);
    } catch {
      setError('Could not disable notifications.');
    } finally {
      setBusy(false);
    }
  }, [busy, supported]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    busy,
    error,
    enable,
    disable,
    refreshSubscriptionState,
  };
}
