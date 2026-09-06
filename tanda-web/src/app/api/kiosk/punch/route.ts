import { NextResponse } from 'next/server';
import { KioskAccessError, requireKioskOperator } from '@/lib/kiosk/server/kiosk-operator';
import { KioskPunchError, recordKioskPunch } from '@/lib/kiosk/server/punch-service';

export async function POST(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const body = (await request.json()) as {
      employeePin?: string;
      locationId?: string;
      photoPath?: string;
      photoUrl?: string;
      actionType?: string;
      latitude?: number;
      longitude?: number;
      geoAccuracy?: number;
      geoCapturedAt?: string;
    };

    const employeePin = body.employeePin?.trim() ?? '';
    const photoPath = body.photoPath?.trim() ?? '';
    const photoUrl = body.photoUrl?.trim() ?? '';
    const actionType =
      body.actionType === 'check_in' ||
      body.actionType === 'check_out' ||
      body.actionType === 'break_start' ||
      body.actionType === 'break_end'
        ? body.actionType
        : undefined;

    if (!photoPath || !photoUrl) {
      return NextResponse.json({ error: 'Photo is required.' }, { status: 400 });
    }

    const result = await recordKioskPunch({
      operator,
      locationId: body.locationId?.trim() ?? '',
      employeePin,
      photoPath,
      photoUrl,
      actionType,
      latitude: body.latitude,
      longitude: body.longitude,
      geoAccuracy: body.geoAccuracy,
      geoCapturedAt: body.geoCapturedAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KioskAccessError || error instanceof KioskPunchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/punch', error);
    return NextResponse.json({ error: 'Could not save attendance.' }, { status: 500 });
  }
}
