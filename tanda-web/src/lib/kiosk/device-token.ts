const CLIENT_SESSION_KEY = 'kiosk_client_session_id';
const DEVICE_TOKEN_KEY = 'kiosk_device_token';

let migrated = false;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

/** Copies kiosk ids from sessionStorage after older builds stored them per-tab only. */
function migrateKioskStorage(): void {
  if (migrated || typeof window === 'undefined') return;
  migrated = true;

  const storage = getStorage();
  if (!storage) return;

  for (const key of [CLIENT_SESSION_KEY, DEVICE_TOKEN_KEY]) {
    const sessionValue = window.sessionStorage.getItem(key)?.trim();
    const localValue = storage.getItem(key)?.trim();
    if (sessionValue && !localValue) {
      storage.setItem(key, sessionValue);
    }
    window.sessionStorage.removeItem(key);
  }
}

/** Stable per browser profile — survives browser restarts on the same device. */
export function getKioskClientSessionId(): string {
  migrateKioskStorage();
  return getStorage()?.getItem(CLIENT_SESSION_KEY)?.trim() ?? '';
}

export function ensureKioskClientSessionId(): string {
  if (typeof window === 'undefined') return '';

  migrateKioskStorage();

  const storage = getStorage();
  if (!storage) return '';

  const existing = getKioskClientSessionId();
  if (existing) return existing;

  const id = crypto.randomUUID();
  storage.setItem(CLIENT_SESSION_KEY, id);
  return id;
}

export function getKioskDeviceToken(): string {
  migrateKioskStorage();
  return getStorage()?.getItem(DEVICE_TOKEN_KEY)?.trim() ?? '';
}

/** Mints and persists a device token for this browser profile. Called at activation. */
export function ensureKioskDeviceToken(): string {
  if (typeof window === 'undefined') return '';

  migrateKioskStorage();

  const storage = getStorage();
  if (!storage) return '';

  const existing = getKioskDeviceToken();
  if (existing) return existing;

  const token = crypto.randomUUID();
  storage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}

export function clearKioskDeviceToken(): void {
  if (typeof window === 'undefined') return;
  getStorage()?.removeItem(DEVICE_TOKEN_KEY);
  window.sessionStorage.removeItem(DEVICE_TOKEN_KEY);
}

export function clearKioskClientSessionId(): void {
  if (typeof window === 'undefined') return;
  getStorage()?.removeItem(CLIENT_SESSION_KEY);
  window.sessionStorage.removeItem(CLIENT_SESSION_KEY);
}

/** Drops all kiosk browser state so the next login does not inherit this device. */
export function clearKioskLocalCache(): void {
  clearKioskDeviceToken();
  clearKioskClientSessionId();
}

export function kioskDeviceHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Kiosk-Device-Token': getKioskDeviceToken(),
    'X-Kiosk-Client-Session': ensureKioskClientSessionId(),
  };
}
