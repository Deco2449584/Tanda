import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { getKioskClientSessionIdFromRequest } from '@/lib/kiosk/server/device-token';
import {
  getKioskDeviceById,
  rerequestKioskDevice,
} from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const auth = await verifyKioskRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as { deviceId?: string };
    const deviceId = body.deviceId?.trim() || getKioskClientSessionIdFromRequest(request) || '';
    if (!deviceId) {
      return NextResponse.json({ error: 'Device id is required.' }, { status: 400 });
    }

    const device = await getKioskDeviceById(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    const ownerEmail = device.ownerEmail ?? device.createdBy;
    if (ownerEmail && ownerEmail !== auth.email && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const session = await rerequestKioskDevice(deviceId, auth.role === 'empleado');
    return NextResponse.json({ session });
  } catch (error) {
    console.error('POST /api/kiosk/devices/rerequest', error);
    const message = error instanceof Error ? error.message : 'Could not request access.';
    const status = message.includes('not found') || message.includes('not revoked') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
