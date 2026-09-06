'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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

async function getExistingServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  return (
    (await navigator.serviceWorker.getRegistration('/')) ??
    (await navigator.serviceWorker.getRegistration()) ??
    null
  );
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const existing = await getExistingServiceWorkerRegistration();
  if (existing) {
    return existing;
  }

  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
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

function readBrowserPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

type PushStoreState = {
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  loading: boolean;
  busy: boolean;
  error: string;
};

const listeners = new Set<() => void>();

let store: PushStoreState = {
  permission: typeof window === 'undefined' ? 'default' : readBrowserPermission(),
  subscribed: false,
  loading: true,
  busy: false,
  error: '',
};

let refreshInFlight: Promise<void> | null = null;
let syncInFlight: Promise<boolean> | null = null;
let permissionStatus: PermissionStatus | null = null;
let permissionListenerBound = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function patchStore(patch: Partial<PushStoreState>) {
  store = { ...store, ...patch };
  emit();
}

function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getStoreSnapshot(): PushStoreState {
  return store;
}

function getServerSnapshot(): PushStoreState {
  return {
    permission: 'default',
    subscribed: false,
    loading: true,
    busy: false,
    error: '',
  };
}

function isPushSupported(): boolean {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    Boolean(vapidPublicKey)
  );
}

async function refreshSubscriptionState(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    if (!isPushSupported()) {
      patchStore({
        permission: 'unsupported',
        subscribed: false,
        loading: false,
      });
      return;
    }

    patchStore({ loading: true, error: '' });

    try {
      const currentPermission = readBrowserPermission();
      patchStore({ permission: currentPermission });

      if (currentPermission !== 'granted') {
        patchStore({ subscribed: false, loading: false });
        return;
      }

      const registration = await getExistingServiceWorkerRegistration();
      if (!registration) {
        patchStore({ subscribed: false, loading: false });
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      patchStore({ subscribed: Boolean(subscription), loading: false });
    } catch {
      patchStore({ subscribed: false, loading: false });
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function syncSubscriptionInternal(): Promise<boolean> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';
  const registration = await registerServiceWorker();
  if (!registration) {
    patchStore({ error: 'Could not register the notification service.' });
    return false;
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const headers = await getAuthHeaders();
  if (!headers) {
    patchStore({ error: 'You must be signed in to enable notifications.' });
    return false;
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

  patchStore({ subscribed: true, permission: 'granted', error: '' });
  return true;
}

async function syncSubscription(): Promise<boolean> {
  if (!isPushSupported() || store.busy) {
    return false;
  }

  if (readBrowserPermission() !== 'granted') {
    return false;
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    patchStore({ busy: true, error: '' });
    try {
      return await syncSubscriptionInternal();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not enable notifications.';
      patchStore({ error: message, subscribed: false });
      return false;
    } finally {
      patchStore({ busy: false });
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

async function enablePush(): Promise<boolean> {
  if (!isPushSupported() || store.busy) {
    return false;
  }

  patchStore({ busy: true, error: '' });

  try {
    // Re-read before prompting — Android may have changed OS permission while app was backgrounded.
    await refreshSubscriptionState();
    const current = readBrowserPermission();

    let result = current;
    if (current !== 'granted') {
      result = await Notification.requestPermission();
    }
    patchStore({ permission: result });

    if (result !== 'granted') {
      patchStore({
        error: 'Notification permission was not granted.',
        subscribed: false,
      });
      return false;
    }

    return await syncSubscriptionInternal();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not enable notifications.';
    patchStore({ error: message, subscribed: false });
    return false;
  } finally {
    patchStore({ busy: false });
  }
}

async function disablePush(): Promise<void> {
  if (!isPushSupported() || store.busy) {
    return;
  }

  patchStore({ busy: true, error: '' });

  try {
    const registration = await getExistingServiceWorkerRegistration();
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

    patchStore({ subscribed: false });
  } catch {
    patchStore({ error: 'Could not disable notifications.' });
  } finally {
    patchStore({ busy: false });
  }
}

async function bindPermissionListener() {
  if (permissionListenerBound || typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return;
  }

  permissionListenerBound = true;

  try {
    permissionStatus = await navigator.permissions.query({
      name: 'notifications' as PermissionName,
    });

    const onPermissionChange = () => {
      void (async () => {
        await refreshSubscriptionState();
        if (readBrowserPermission() === 'granted' && !store.subscribed) {
          await syncSubscription();
        }
      })();
    };

    permissionStatus.addEventListener('change', onPermissionChange);
  } catch {
    // Safari / some WebViews reject notifications permission query.
    permissionListenerBound = false;
  }
}

let lifecycleBound = false;

function bindLifecycleListeners() {
  if (lifecycleBound || typeof window === 'undefined') {
    return;
  }
  lifecycleBound = true;

  const refreshAndMaybeSync = () => {
    void (async () => {
      await refreshSubscriptionState();
      if (readBrowserPermission() === 'granted' && !store.subscribed) {
        await syncSubscription();
      }
    })();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      refreshAndMaybeSync();
    }
  });
  window.addEventListener('focus', refreshAndMaybeSync);
  window.addEventListener('pageshow', refreshAndMaybeSync);
}

export function usePushNotifications() {
  const state = useSyncExternalStore(
    subscribeStore,
    getStoreSnapshot,
    getServerSnapshot,
  );

  const supported = isPushSupported();

  useEffect(() => {
    bindLifecycleListeners();
    void bindPermissionListener();
    void refreshSubscriptionState().then(async () => {
      if (readBrowserPermission() === 'granted' && !store.subscribed) {
        await syncSubscription();
      }
    });
  }, []);

  const refresh = useCallback(async () => {
    await refreshSubscriptionState();
    if (readBrowserPermission() === 'granted' && !store.subscribed) {
      await syncSubscription();
    }
  }, []);

  const enable = useCallback(async () => enablePush(), []);
  const disable = useCallback(async () => disablePush(), []);
  const sync = useCallback(async () => syncSubscription(), []);

  return {
    supported,
    permission: state.permission,
    subscribed: state.subscribed,
    /** True only when permission is granted and a push subscription exists. */
    enabled: supported && state.permission === 'granted' && state.subscribed,
    loading: state.loading,
    busy: state.busy,
    error: state.error,
    enable,
    syncSubscription: sync,
    disable,
    refreshSubscriptionState: refresh,
  };
}
