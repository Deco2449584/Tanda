import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { getKioskClientSessionIdFromRequest, getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import { activateKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';
import type { KioskDeviceDetails, KioskDeviceType } from '@/lib/types/kiosk-device';

function kioskActivationRequiresApproval(
  role: 'admin' | 'master' | 'kiosk' | 'empleado',
): boolean {
  // Dedicated kiosk accounts and admins activate devices directly.
  return role === 'empleado';
}

const MIN_TOKEN_LENGTH = 16;
const LOCK_PIN_PATTERN = /^\d{4,8}$/;

export async function POST(request: Request) {
  try {
    const auth = await verifyKioskRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      deviceToken?: string;
      clientSessionId?: string;
      type?: KioskDeviceType;
      name?: string;
      locationId?: string;
      lockPin?: string;
      details?: KioskDeviceDetails;
    };

    const clientSessionId =
      body.clientSessionId?.trim() || getKioskClientSessionIdFromRequest(request) || '';
    if (!clientSessionId) {
      return NextResponse.json({ error: 'Client session id is required.' }, { status: 400 });
    }

    const token =
      body.deviceToken?.trim() || getKioskDeviceTokenFromRequest(request) || '';
    if (token.length < MIN_TOKEN_LENGTH) {
      return NextResponse.json({ error: 'Invalid device token.' }, { status: 400 });
    }

    const type: KioskDeviceType = body.type === 'mobile' ? 'mobile' : 'tablet';

    const name = body.name?.trim() ?? '';
    if (!name) {
      return NextResponse.json({ error: 'Device name is required.' }, { status: 400 });
    }

    const locationId = body.locationId?.trim() ?? '';
    if (!locationId) {
      return NextResponse.json({ error: 'A warehouse is required.' }, { status: 400 });
    }

    const lockPin = body.lockPin?.trim();
    if (type === 'tablet') {
      if (!lockPin || !LOCK_PIN_PATTERN.test(lockPin)) {
        return NextResponse.json(
          { error: 'A 4 to 8 digit lock PIN is required for tablets.' },
          { status: 400 },
        );
      }
    }

    const session = await activateKioskDevice({
      clientSessionId,
      token,
      type,
      name,
      locationId,
      lockPin: type === 'tablet' ? lockPin : undefined,
      details: body.details,
      createdBy: auth.email,
      requiresApproval: kioskActivationRequiresApproval(auth.role),
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('POST /api/kiosk/devices/activate', error);
    return NextResponse.json({ error: 'Could not activate device.' }, { status: 500 });
  }
}
