import { NextResponse } from 'next/server';
import { verifyKioskRequest } from '@/lib/auth/verify-kiosk-request';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import { activateKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';
import type { KioskDeviceDetails, KioskDeviceType } from '@/lib/types/kiosk-device';

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
      type?: KioskDeviceType;
      name?: string;
      locationId?: string;
      lockPin?: string;
      details?: KioskDeviceDetails;
    };

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
      token,
      type,
      name,
      locationId,
      lockPin: type === 'tablet' ? lockPin : undefined,
      details: body.details,
      createdBy: auth.email,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('POST /api/kiosk/devices/activate', error);
    return NextResponse.json({ error: 'Could not activate device.' }, { status: 500 });
  }
}
