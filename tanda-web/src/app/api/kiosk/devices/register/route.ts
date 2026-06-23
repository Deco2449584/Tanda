import { NextResponse } from 'next/server';
import {
  getKioskDeviceTokenFromRequest,
  hashKioskDeviceToken,
} from '@/lib/kiosk/server/device-token';
import { registerKioskDevice } from '@/lib/kiosk/server/kiosk-devices-service';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      deviceToken?: string;
      userAgent?: string;
      platform?: string;
      reRequest?: boolean;
    };

    const token =
      body.deviceToken?.trim() || getKioskDeviceTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Device token is required.' }, { status: 400 });
    }

    if (token.length < 16) {
      return NextResponse.json({ error: 'Invalid device token.' }, { status: 400 });
    }

    // Avoid logging raw tokens; hash is stored server-side only.
    void hashKioskDeviceToken(token);

    const session = await registerKioskDevice({
      token,
      userAgent: body.userAgent ?? request.headers.get('user-agent') ?? '',
      platform: body.platform ?? 'web',
      reRequest: body.reRequest === true,
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('POST /api/kiosk/devices/register', error);
    return NextResponse.json({ error: 'Could not register device.' }, { status: 500 });
  }
}
