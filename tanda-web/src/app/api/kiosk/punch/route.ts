import { NextResponse } from 'next/server';
import { getKioskDeviceTokenFromRequest } from '@/lib/kiosk/server/device-token';
import { KioskPunchError, recordKioskPunch } from '@/lib/kiosk/server/punch-service';

export async function POST(request: Request) {
  try {
    const token = getKioskDeviceTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Device token is required.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      employeePin?: string;
      photoPath?: string;
      photoUrl?: string;
      latitude?: number;
      longitude?: number;
      geoAccuracy?: number;
      geoCapturedAt?: string;
    };

    const employeePin = body.employeePin?.trim() ?? '';
    const photoPath = body.photoPath?.trim() ?? '';
    const photoUrl = body.photoUrl?.trim() ?? '';

    if (!photoPath || !photoUrl) {
      return NextResponse.json({ error: 'Photo is required.' }, { status: 400 });
    }

    const result = await recordKioskPunch({
      deviceToken: token,
      employeePin,
      photoPath,
      photoUrl,
      latitude: body.latitude,
      longitude: body.longitude,
      geoAccuracy: body.geoAccuracy,
      geoCapturedAt: body.geoCapturedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KioskPunchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/punch', error);
    return NextResponse.json({ error: 'Could not save attendance.' }, { status: 500 });
  }
}
