import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import {
  buildKioskDeviceSession,
  findKioskDeviceByToken,
  resumeKioskDeviceSession,
} from '@/lib/kiosk/server/kiosk-devices-service';

/** Resumes the device session for a stored token (used on kiosk load). */
export async function GET(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);

    if (token) {
      const device = await findKioskDeviceByToken(token);
      if (device?.status === 'active') {
        await device.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });
        const session = await buildKioskDeviceSession(device);
        return NextResponse.json({ session });
      }
    }

    const auth = await verifyKioskRequest(request);
    if (!auth || !token) {
      return NextResponse.json({ session: null });
    }

    const session = await resumeKioskDeviceSession({
      ownerEmail: auth.email,
      token,
      createdBy: auth.email,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('GET /api/kiosk/devices/session', error);
    return NextResponse.json({ error: 'Could not load device session.' }, { status: 500 });
  }
}
