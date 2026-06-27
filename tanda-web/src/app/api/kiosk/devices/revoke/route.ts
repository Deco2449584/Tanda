import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { pickKioskDeviceAuditSnapshot } from '@/lib/kiosk/kiosk-audit-helpers';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  getKioskDeviceById,
  revokeKioskDevice,
  revokeKioskDevicesByOwner,
} from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      deviceId?: string;
      ownerEmail?: string;
      scope?: 'session' | 'user';
    };

    if (body.scope === 'user') {
      const ownerEmail = body.ownerEmail?.trim();
      if (!ownerEmail) {
        return NextResponse.json({ error: 'User email is required.' }, { status: 400 });
      }

      const count = await revokeKioskDevicesByOwner(ownerEmail);

      await recordAuditFromRequest(request, admin, {
        action: 'kiosk_device.revoked',
        entityType: 'system',
        entityId: ownerEmail,
        summary: `Revoked ${count} kiosk device${count === 1 ? '' : 's'} for ${ownerEmail}`,
        metadata: { scope: 'user', revokedCount: count },
      });

      return NextResponse.json({ ok: true, revokedCount: count });
    }

    const deviceId = body.deviceId?.trim();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device id is required.' }, { status: 400 });
    }

    const device = await getKioskDeviceById(deviceId);
    if (!device) {
      return NextResponse.json({ error: 'Device not found.' }, { status: 404 });
    }

    await revokeKioskDevice(deviceId);

    await recordAuditFromRequest(request, admin, {
      action: 'kiosk_device.revoked',
      entityType: 'system',
      entityId: deviceId,
      summary: `Revoked kiosk device "${device.name}"`,
      before: pickKioskDeviceAuditSnapshot(device),
      after: null,
    });

    return NextResponse.json({ ok: true, revokedCount: 1 });
  } catch (error) {
    console.error('POST /api/kiosk/devices/revoke', error);
    return NextResponse.json({ error: 'Could not revoke device.' }, { status: 500 });
  }
}
