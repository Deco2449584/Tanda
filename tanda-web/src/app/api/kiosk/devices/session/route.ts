import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import {
  buildKioskDeviceSession,
  findKioskDeviceByToken,
} from '@/lib/kiosk/server/kiosk-devices-service';

/** Resumes the device session for a stored token (used on kiosk load). */
export async function GET(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ session: null });
    }

    const device = await findKioskDeviceByToken(token);
    if (!device || device.status !== 'active') {
      return NextResponse.json({ session: null });
    }

    await device.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });

    const session = await buildKioskDeviceSession(device);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('GET /api/kiosk/devices/session', error);
    return NextResponse.json({ error: 'Could not load device session.' }, { status: 500 });
  }
}
