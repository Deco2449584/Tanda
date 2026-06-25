const DEVICE_TOKEN_STORAGE_KEY = 'kiosk_device_token';

export function getKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY)?.trim() ?? '';
}

/** Mints and persists a device token. Called once, deliberately, at activation. */
export function ensureKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';

  const existing = getKioskDeviceToken();
  if (existing) return existing;

  const token = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
  return token;
}

export function clearKioskDeviceToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
}

export function kioskDeviceHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Kiosk-Device-Token': getKioskDeviceToken(),
  };
}
