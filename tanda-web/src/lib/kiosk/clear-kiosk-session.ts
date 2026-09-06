import { clearStoredKioskLocationId } from '@/lib/kiosk/active-location';
import { clearKioskModeActive } from '@/lib/kiosk/kiosk-lock-state';
import { exitKioskFullscreen } from '@/lib/pwa/kiosk-display';

/** Clears kiosk local state and exits fullscreen punch mode. */
export async function releaseKioskSession(): Promise<void> {
  clearStoredKioskLocationId();
  clearKioskModeActive();
  await exitKioskFullscreen();
}
