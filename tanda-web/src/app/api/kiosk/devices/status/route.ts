import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import {
  buildKioskDeviceSession,
  findKioskDeviceByToken,
} from '@/lib/kiosk/server/kiosk-devices-service';

export async function GET(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Device token is required.' }, { status: 401 });
    }

    const device = await findKioskDeviceByToken(token);
    if (!device) {
      return NextResponse.json({ error: 'Device not registered.' }, { status: 404 });
    }

    await device.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });

    const session = await buildKioskDeviceSession(device);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('GET /api/kiosk/devices/status', error);
    return NextResponse.json({ error: 'Could not load device status.' }, { status: 500 });
  }
}
