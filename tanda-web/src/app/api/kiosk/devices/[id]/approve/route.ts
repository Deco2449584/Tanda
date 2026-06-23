import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { approveKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

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
    const body = (await request.json()) as {
      locationId?: string;
      label?: string;
    };

    const locationId = body.locationId?.trim();
    if (!locationId) {
      return NextResponse.json({ error: 'Location is required.' }, { status: 400 });
    }

    await approveKioskDevice({
      deviceId: id,
      locationId,
      label: body.label,
      approvedBy: admin.email,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/kiosk/devices/[id]/approve', error);
    return NextResponse.json({ error: 'Could not approve device.' }, { status: 500 });
  }
}
