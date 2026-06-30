import { auth } from '@/lib/firebase';
import type { KioskDevice } from '@/lib/types/kiosk-device';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not signed in.');
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchKioskDevices(): Promise<KioskDevice[]> {
  const response = await fetch('/api/kiosk/devices', {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Could not load kiosk devices.');
  }

  const data = (await response.json()) as { devices: KioskDevice[] };
  return data.devices;
}
