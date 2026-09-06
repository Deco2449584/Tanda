const ACTIVE_LOCATION_KEY = 'kiosk_active_location_id';

export function getStoredKioskLocationId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(ACTIVE_LOCATION_KEY)?.trim() ?? '';
}

export function setStoredKioskLocationId(locationId: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = locationId.trim();
  if (!trimmed) {
    window.localStorage.removeItem(ACTIVE_LOCATION_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_LOCATION_KEY, trimmed);
}

export function clearStoredKioskLocationId(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_LOCATION_KEY);
}

export function resolveStoredKioskLocationId(
  allowedLocationIds: readonly string[],
  defaultLocationId: string,
): string {
  const stored = getStoredKioskLocationId();
  if (stored && allowedLocationIds.includes(stored)) {
    return stored;
  }
  if (defaultLocationId && allowedLocationIds.includes(defaultLocationId)) {
    return defaultLocationId;
  }
  return allowedLocationIds[0] ?? '';
}
