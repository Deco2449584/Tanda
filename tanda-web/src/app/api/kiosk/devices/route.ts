import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { listKioskDevices } from '@/lib/kiosk/server/kiosk-devices-service';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const devices = await listKioskDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    console.error('GET /api/kiosk/devices', error);
    return NextResponse.json({ error: 'Could not load kiosk devices.' }, { status: 500 });
  }
}
