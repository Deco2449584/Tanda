import { NextResponse } from 'next/server';
import {
  assertLocationAllowedForOperator,
  KioskAccessError,
  loadKioskAllowedLocations,
  requireKioskOperator,
} from '@/lib/kiosk/server/kiosk-operator';
import { recordKioskLoginEvent } from '@/lib/kiosk/server/kiosk-login-logs';

export async function POST(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const body = (await request.json()) as { locationId?: string };
    const locationId = body.locationId?.trim() ?? '';

    if (!locationId) {
      return NextResponse.json({ error: 'Client is required.' }, { status: 400 });
    }

    const { options } = await loadKioskAllowedLocations(operator);
    const location = assertLocationAllowedForOperator(locationId, options);

    await recordKioskLoginEvent({
      operator,
      event: 'location_change',
      locationId: location.id,
      locationName: location.city ? `${location.name} (${location.city})` : location.name,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json({
      locationId: location.id,
      locationName: location.name,
      locationCity: location.city,
    });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/active-location', error);
    return NextResponse.json({ error: 'Could not change client.' }, { status: 500 });
  }
}
