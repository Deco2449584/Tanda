import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { approveKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      deviceId?: string;
      locationId?: string;
      label?: string;
    };

    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device id is required.' }, { status: 400 });
    }

    const locationId = body.locationId?.trim();
    if (!locationId) {
      return NextResponse.json({ error: 'Location is required.' }, { status: 400 });
    }

    await approveKioskDevice({
      deviceId,
      locationId,
      label: body.label,
      approvedBy: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/kiosk/devices/approve', error);
    return NextResponse.json({ error: 'Could not approve device.' }, { status: 500 });
  }
}
