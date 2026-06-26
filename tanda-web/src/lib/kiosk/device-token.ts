const CLIENT_SESSION_KEY = 'kiosk_client_session_id';
const DEVICE_TOKEN_KEY = 'kiosk_device_token';
const LEGACY_DEVICE_TOKEN_KEY = 'kiosk_device_token';

let migrated = false;

function migrateLegacyTokenFromLocalStorage(): void {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;

  const legacy = window.localStorage.getItem(LEGACY_DEVICE_TOKEN_KEY)?.trim();
  if (legacy && !window.sessionStorage.getItem(DEVICE_TOKEN_KEY)) {
    window.sessionStorage.setItem(DEVICE_TOKEN_KEY, legacy);
  }
  window.localStorage.removeItem(LEGACY_DEVICE_TOKEN_KEY);
}

/** Stable per browser tab — survives reloads, not shared across tabs. */
export function getKioskClientSessionId(): string {
  if (typeof window === 'undefined') return '';
  migrateLegacyTokenFromLocalStorage();
  return window.sessionStorage.getItem(CLIENT_SESSION_KEY)?.trim() ?? '';
}

export function ensureKioskClientSessionId(): string {
  if (typeof window === 'undefined') return '';

  migrateLegacyTokenFromLocalStorage();

  const existing = getKioskClientSessionId();
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.sessionStorage.setItem(CLIENT_SESSION_KEY, id);
  return id;
}

export function getKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';
  migrateLegacyTokenFromLocalStorage();
  return window.sessionStorage.getItem(DEVICE_TOKEN_KEY)?.trim() ?? '';
}

/** Mints and persists a device token for this tab. Called at activation. */
export function ensureKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';

  migrateLegacyTokenFromLocalStorage();

  const existing = getKioskDeviceToken();
  if (existing) return existing;

  const token = crypto.randomUUID();
  window.sessionStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}

export function clearKioskDeviceToken(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DEVICE_TOKEN_KEY);
}

export function kioskDeviceHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Kiosk-Device-Token': getKioskDeviceToken(),
    'X-Kiosk-Client-Session': ensureKioskClientSessionId(),
  };
}
