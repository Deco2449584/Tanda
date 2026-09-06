import { NextResponse } from 'next/server';
import {
  buildKioskContext,
  KioskAccessError,
  requireKioskOperator,
} from '@/lib/kiosk/server/kiosk-operator';

export async function GET(request: Request) {
  try {
    const operator = await requireKioskOperator(request);
    const context = await buildKioskContext(operator);
    return NextResponse.json({ context });
  } catch (error) {
    if (error instanceof KioskAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('GET /api/kiosk/context', error);
    return NextResponse.json({ error: 'Could not load kiosk.' }, { status: 500 });
  }
}
