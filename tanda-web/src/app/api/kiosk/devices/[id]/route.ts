import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { updateKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

export async function PATCH(
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

    await updateKioskDevice({
      deviceId: id,
      locationId: body.locationId,
      label: body.label,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/kiosk/devices/[id]', error);
    return NextResponse.json({ error: 'Could not update device.' }, { status: 500 });
  }
}
