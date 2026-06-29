import { clearKioskLocalCache } from '@/lib/kiosk/device-token';
import { clearKioskModeActive } from '@/lib/kiosk/kiosk-lock-state';
import { exitKioskFullscreen } from '@/lib/pwa/kiosk-display';

/** Clears kiosk local storage and exits fullscreen punch mode. */
export async function releaseKioskSession(): Promise<void> {
  clearKioskLocalCache();
  clearKioskModeActive();
  await exitKioskFullscreen();
}
