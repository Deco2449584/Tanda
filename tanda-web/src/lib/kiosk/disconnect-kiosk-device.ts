import { auth } from '@/lib/firebase';
import {
  getKioskClientSessionId,
  getKioskDeviceToken,
  kioskDeviceHeaders,
} from '@/lib/kiosk/device-token';

/** Ends the kiosk device record for this browser before local cache is cleared. */
export async function disconnectKioskDeviceSession(): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) return;

  const clientSessionId = getKioskClientSessionId();
  const deviceToken = getKioskDeviceToken();
  if (!clientSessionId && !deviceToken) return;

  try {
    const idToken = await currentUser.getIdToken();
    await fetch('/api/kiosk/devices/disconnect', {
      method: 'POST',
      headers: {
        ...kioskDeviceHeaders(),
        Authorization: `Bearer ${idToken}`,
      },
    });
  } catch {
    // Best effort — local sign-out should still proceed.
  }
}
