import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { pickKioskDeviceAuditSnapshot } from '@/lib/kiosk/kiosk-audit-helpers';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  deleteKioskDevice,
  getKioskDeviceById,
  updateKioskDevice,
} from '@/lib/kiosk/server/kiosk-devices-service';
import type { KioskDeviceType } from '@/lib/types/kiosk-device';

const LOCK_PIN_PATTERN = /^\d{4,8}$/;

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
      type?: KioskDeviceType;
      lockPin?: string;
    };

    const device = await getKioskDeviceById(id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    const finalType: KioskDeviceType =
      body.type === 'tablet' || body.type === 'mobile' ? body.type : device.type;

    const newPin = body.lockPin?.trim();
    if (newPin && !LOCK_PIN_PATTERN.test(newPin)) {
      return NextResponse.json(
        { error: 'The lock PIN must be 4 to 8 digits.' },
        { status: 400 },
      );
    }

    const willHavePin =
      finalType === 'mobile' ? false : Boolean(newPin) || device.hasLockPin;

    if (finalType === 'tablet' && !willHavePin) {
      return NextResponse.json(
        { error: 'Set a 4 to 8 digit PIN to enable locked kiosk mode.' },
        { status: 400 },
      );
    }

    await updateKioskDevice({
      deviceId: id,
      locationId: body.locationId,
      name: body.name,
      type: finalType,
      lockPin: newPin || undefined,
      clearLockPin: finalType === 'mobile',
    });

    const after = await getKioskDeviceById(id);

    await recordAuditFromRequest(request, admin, {
      action: 'kiosk_device.updated',
      entityType: 'system',
      entityId: id,
      summary: `Updated kiosk device "${after?.name ?? device.name}"`,
      before: pickKioskDeviceAuditSnapshot(device),
      after: after ? pickKioskDeviceAuditSnapshot(after) : null,
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
    const device = await getKioskDeviceById(id);
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    await deleteKioskDevice(id);

    await recordAuditFromRequest(request, admin, {
      action: 'kiosk_device.deleted',
      entityType: 'system',
      entityId: id,
      summary: `Deleted kiosk device "${device.name}"`,
      before: pickKioskDeviceAuditSnapshot(device),
      after: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/kiosk/devices/[id]', error);
    return NextResponse.json({ error: 'Could not delete device.' }, { status: 500 });
  }
}
