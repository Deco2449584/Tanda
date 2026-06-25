const KIOSK_MODE_ACTIVE_KEY = 'kiosk_mode_active';

/** True while the device is in fullscreen punch mode (not while browsing the dashboard). */
export function setKioskModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    window.sessionStorage.setItem(KIOSK_MODE_ACTIVE_KEY, '1');
  } else {
    window.sessionStorage.removeItem(KIOSK_MODE_ACTIVE_KEY);
  }
}

export function isKioskModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(KIOSK_MODE_ACTIVE_KEY) === '1';
}

export function clearKioskModeActive(): void {
  setKioskModeActive(false);
}
