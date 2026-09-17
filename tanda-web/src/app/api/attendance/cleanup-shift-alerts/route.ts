import { NextResponse } from 'next/server';
import { cleanupAttendanceAlertsForShift } from '@/lib/attendance/server/attendance-alerts-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

/** Removes no-show / late notifications + justifications for a deleted shift. */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as { shiftId?: string };
    const shiftId = body.shiftId?.trim() ?? '';
    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required.' }, { status: 400 });
    }

    const result = await cleanupAttendanceAlertsForShift(shiftId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/attendance/cleanup-shift-alerts', error);
    return NextResponse.json(
      { error: 'Could not clean up attendance alerts.' },
      { status: 500 },
    );
  }
}
