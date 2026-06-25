import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  deleteKioskDevice,
  updateKioskDevice,
} from '@/lib/kiosk/server/kiosk-devices-service';

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
      name?: string;
    };

    await updateKioskDevice({
      deviceId: id,
      locationId: body.locationId,
      name: body.name,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/kiosk/devices/[id]', error);
    return NextResponse.json({ error: 'Could not update device.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    await deleteKioskDevice(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/kiosk/devices/[id]', error);
    return NextResponse.json({ error: 'Could not delete device.' }, { status: 500 });
  }
}
