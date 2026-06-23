import { NextResponse } from 'next/server';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import { KioskPunchError, lookupKioskEmployee } from '@/lib/kiosk/server/punch-service';

export async function POST(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Device token is required.' }, { status: 401 });
    }

    const body = (await request.json()) as { employeePin?: string };
    const employeePin = body.employeePin?.trim() ?? '';

    const result = await lookupKioskEmployee({ deviceToken: token, employeePin });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KioskPunchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/lookup', error);
    return NextResponse.json({ error: 'Could not validate employee.' }, { status: 500 });
  }
}
