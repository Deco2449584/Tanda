import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { getKioskDeviceById, restoreKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as { deviceId?: string };
    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device id is required.' }, { status: 400 });
    }

    const device = await getKioskDeviceById(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    if (device.status !== 'revoked') {
      return NextResponse.json({ error: 'Device is not revoked.' }, { status: 400 });
    }

    await restoreKioskDevice(deviceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/kiosk/devices/restore', error);
    return NextResponse.json({ error: 'Could not restore device.' }, { status: 500 });
  }
}
