import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import {
  getKioskClientSessionIdFromRequest,
  getKioskDeviceTokenFromRequest,
} from '@/lib/kiosk/server/device-token';
import {
  buildKioskDeviceSession,
  resolveKioskDeviceForClient,
} from '@/lib/kiosk/server/kiosk-devices-service';

/** Resumes the device session for this browser tab (used on kiosk load). */
export async function GET(request: Request) {
  try {
    const auth = await verifyKioskRequest(request);
    if (!auth) {
      return NextResponse.json({
        session: null,
        pendingDevice: null,
        revokedDevice: null,
        resetToken: true,
      });
    }

    const clientSessionId = getKioskClientSessionIdFromRequest(request);
    const token = getKioskDeviceTokenFromRequest(request);

    if (!clientSessionId && !token) {
      return NextResponse.json({
        session: null,
        pendingDevice: null,
        revokedDevice: null,
        resetToken: false,
      });
    }

    const device = await resolveKioskDeviceForClient({ clientSessionId, token });
    if (!device) {
      return NextResponse.json({
        session: null,
        pendingDevice: null,
        revokedDevice: null,
        resetToken: Boolean(token),
      });
    }

    if (device.status === 'revoked') {
      const revokedDevice = await buildKioskDeviceSession(device);
      return NextResponse.json({
        session: null,
        pendingDevice: null,
        revokedDevice,
        resetToken: false,
      });
    }

    if (device.status === 'pending') {
      const pendingDevice = await buildKioskDeviceSession(device);
      return NextResponse.json({
        session: null,
        pendingDevice,
        revokedDevice: null,
        resetToken: false,
      });
    }

    await device.ref.update({ lastSeenAt: FieldValue.serverTimestamp() });
    const session = await buildKioskDeviceSession(device);
    return NextResponse.json({
      session,
      pendingDevice: null,
      revokedDevice: null,
      resetToken: false,
    });
  } catch (error) {
    console.error('GET /api/kiosk/devices/session', error);
    return NextResponse.json({ error: 'Could not load device session.' }, { status: 500 });
  }
}
