import { NextResponse } from 'next/server';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import { verifyKioskLockPin } from '@/lib/kiosk/server/kiosk-devices-service';

/** Verifies the lock PIN so a tablet can leave kiosk mode. */
export async function POST(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Device token is required.' }, { status: 401 });
    }

    const body = (await request.json()) as { pin?: string };
    const pin = body.pin?.trim() ?? '';
    if (!pin) {
      return NextResponse.json({ error: 'PIN is required.' }, { status: 400 });
    }

    const ok = await verifyKioskLockPin(token, pin);
    if (!ok) {
      return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/kiosk/devices/unlock', error);
    return NextResponse.json({ error: 'Could not verify PIN.' }, { status: 500 });
  }
}
