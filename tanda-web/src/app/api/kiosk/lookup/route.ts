import { NextResponse } from 'next/server';
import { KioskAccessError, requireKioskOperator } from '@/lib/kiosk/server/kiosk-operator';
import { KioskPunchError, lookupKioskEmployee } from '@/lib/kiosk/server/punch-service';

export async function POST(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const body = (await request.json()) as {
      employeePin?: string;
      locationId?: string;
    };

    const result = await lookupKioskEmployee({
      operator,
      locationId: body.locationId?.trim() ?? '',
      employeePin: body.employeePin?.trim() ?? '',
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KioskAccessError || error instanceof KioskPunchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('POST /api/kiosk/lookup', error);
    return NextResponse.json({ error: 'Could not validate employee.' }, { status: 500 });
  }
}
