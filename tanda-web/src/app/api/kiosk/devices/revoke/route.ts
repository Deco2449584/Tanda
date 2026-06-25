import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  revokeKioskDevice,
  revokeKioskDevicesByOwner,
} from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      deviceId?: string;
      ownerEmail?: string;
      scope?: 'session' | 'user';
    };

    if (body.scope === 'user') {
      const ownerEmail = body.ownerEmail?.trim();
      if (!ownerEmail) {
        return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
      }

      const count = await revokeKioskDevicesByOwner(ownerEmail);
      return NextResponse.json({ ok: true, revokedCount: count });
    }

    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device id is required.' }, { status: 400 });
    }

    await revokeKioskDevice(deviceId);
    return NextResponse.json({ ok: true, revokedCount: 1 });
  } catch (error) {
    console.error('POST /api/kiosk/devices/revoke', error);
    return NextResponse.json({ error: 'Could not revoke device.' }, { status: 500 });
  }
}
