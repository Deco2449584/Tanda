const DEVICE_TOKEN_STORAGE_KEY = 'kiosk_device_token';

export function getOrCreateKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';

  const existing = window.localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY)?.trim();
  if (existing) return existing;

  const token = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);
  return token;
}

export function getKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DEVICE_TOKEN_STORAGE_KEY)?.trim() ?? '';
}

export function clearKioskDeviceToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
}

export function kioskDeviceHeaders(): HeadersInit {
  const token = getKioskDeviceToken();
  return {
    'Content-Type': 'application/json',
    'X-Kiosk-Device-Token': token,
  };
}
