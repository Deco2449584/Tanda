import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { revokeKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    await revokeKioskDevice(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/kiosk/devices/[id]/revoke', error);
    return NextResponse.json({ error: 'Could not revoke device.' }, { status: 500 });
  }
}
