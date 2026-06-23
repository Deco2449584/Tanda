import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { countPendingKioskDevices } from '@/lib/kiosk/server/kiosk-devices-service';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const pendingCount = await countPendingKioskDevices();
    return NextResponse.json({ pendingCount });
  } catch (error) {
    console.error('GET /api/kiosk/devices/pending-count', error);
    return NextResponse.json({ error: 'Could not load pending count.' }, { status: 500 });
  }
}
