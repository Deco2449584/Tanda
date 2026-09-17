import { NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import {
  countPendingJustifications,
  evaluateDailyAttendanceAlerts,
} from '@/lib/attendance/server/attendance-alerts-service';

export async function POST(request: Request) {
  try {
    const user = await verifyFirebaseToken(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const result = await evaluateDailyAttendanceAlerts();
    const pendingJustifications = await countPendingJustifications();

    return NextResponse.json({
      ok: true,
      ...result,
      pendingJustifications,
    });
  } catch (error) {
    console.error('POST /api/attendance/evaluate-alerts', error);
    return NextResponse.json(
      { error: 'Could not evaluate attendance alerts.' },
      { status: 500 },
    );
  }
}
