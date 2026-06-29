import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { pickKioskDeviceAuditSnapshot } from '@/lib/kiosk/kiosk-audit-helpers';
import {
  getKioskClientSessionIdFromRequest,
  getKioskDeviceTokenFromRequest,
} from '@/lib/kiosk/server/device-token';
import {
  deleteKioskDevice,
  isKioskDeviceOwnedBy,
  resolveKioskDeviceForClient,
} from '@/lib/kiosk/server/kiosk-devices-service';

/** Called when the kiosk user signs out — removes this browser connection from admin lists. */
export async function POST(request: Request) {
  try {
    const auth = await verifyKioskRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const clientSessionId = getKioskClientSessionIdFromRequest(request);
    const token = getKioskDeviceTokenFromRequest(request);

    const device = await resolveKioskDeviceForClient({ clientSessionId, token });
    if (!device) {
      return NextResponse.json({ ok: true, disconnected: false });
    }

    if (!isKioskDeviceOwnedBy(device, auth.email)) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const snapshot = pickKioskDeviceAuditSnapshot(device);
    await deleteKioskDevice(device.id);

    await recordAuditFromRequest(request, auth, {
      action: 'kiosk_device.session_ended',
      entityType: 'system',
      entityId: device.id,
      summary: `Kiosk session ended on sign out (${device.name || 'device'})`,
      before: snapshot,
      after: null,
      metadata: { reason: 'sign_out', ownerEmail: auth.email },
    });

    return NextResponse.json({ ok: true, disconnected: true, deviceId: device.id });
  } catch (error) {
    console.error('POST /api/kiosk/devices/disconnect', error);
    return NextResponse.json({ error: 'Could not end kiosk session.' }, { status: 500 });
  }
}
