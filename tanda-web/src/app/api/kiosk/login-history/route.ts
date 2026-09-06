import { NextResponse } from 'next/server';
import {
  KioskAccessError,
  loadKioskAllowedLocations,
  requireKioskOperator,
} from '@/lib/kiosk/server/kiosk-operator';
import {
  listKioskLoginHistory,
  recordKioskLoginEvent,
} from '@/lib/kiosk/server/kiosk-login-logs';

export async function GET(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const logs = await listKioskLoginHistory(operator);
    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/kiosk/login-history', error);
    return NextResponse.json({ error: 'Could not load history.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const body = (await request.json().catch(() => null)) as
      | { locationId?: string }
      | null;
    const { options } = await loadKioskAllowedLocations(operator);
    const location = options.find((item) => item.id === body?.locationId?.trim());

    await recordKioskLoginEvent({
      operator,
      event: 'login',
      locationId: location?.id,
      locationName: location
        ? location.city
          ? `${location.name} (${location.city})`
          : location.name
        : undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/login-history', error);
    return NextResponse.json({ error: 'Could not record login.' }, { status: 500 });
  }
}
