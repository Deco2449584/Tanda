/**
 * Register the workforce service worker early so Chrome can offer a real
 * WebAPK install (requires an active SW with a fetch handler).
 */
export async function registerWorkforceServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing =
      (await navigator.serviceWorker.getRegistration('/')) ??
      (await navigator.serviceWorker.getRegistration());

    if (existing?.active) {
      return existing;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.warn('Service worker registration failed', error);
    return null;
  }
}
