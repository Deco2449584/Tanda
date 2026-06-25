import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import {
  buildKioskDeviceSession,
  findKioskDeviceByToken,
} from '@/lib/kiosk/server/kiosk-devices-service';

/** Resumes the device session for a stored token (used on kiosk load). */
export async function GET(request: Request) {
  try {
    const auth = await verifyKioskRequest(request);
    if (!auth) {
      return NextResponse.json({ session: null, pendingDevice: null, resetToken: true });
    }

    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ session: null, pendingDevice: null, resetToken: false });
    }

    const device = await findKioskDeviceByToken(token);
    if (!device) {
      return NextResponse.json({ session: null, pendingDevice: null, resetToken: true });
    }

    if (device.status === 'revoked') {
      return NextResponse.json({ session: null, pendingDevice: null, resetToken: true });
    }

    if (device.status === 'pending') {
      const pendingDevice = await buildKioskDeviceSession(device);
      return NextResponse.json({ session: null, pendingDevice, resetToken: false });
    }

    await device.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });
    const session = await buildKioskDeviceSession(device);
    return NextResponse.json({ session, pendingDevice: null, resetToken: false });
  } catch (error) {
    console.error('GET /api/kiosk/devices/session', error);
    return NextResponse.json({ error: 'Could not load device session.' }, { status: 500 });
  }
}
