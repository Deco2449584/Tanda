import { NextResponse } from 'next/server';
import {
  recordScanPunch,
  ScanPunchError,
} from '@/lib/attendance/server/scan-punch-service';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';

export async function POST(request: Request) {
  try {
    const employee = await loadEmployeeContext(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      token?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      geoAccuracy?: unknown;
      geoCapturedAt?: unknown;
    };

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'Scan token is required.' }, { status: 400 });
    }

    const result = await recordScanPunch({
      employee,
      token,
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
      geoAccuracy:
        typeof body.geoAccuracy === 'number' ? body.geoAccuracy : undefined,
      geoCapturedAt:
        typeof body.geoCapturedAt === 'string' ? body.geoCapturedAt : undefined,
    });

    return NextResponse.json({
      ok: true,
      actionType: result.actionType,
      recordedAt: result.recordedAt,
      employeeName: result.employeeName,
      locationName: result.locationName,
      locationCity: result.locationCity,
      state: result.state,
    });
  } catch (error) {
    if (error instanceof ScanPunchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('POST /api/attendance/scan-punch', error);
    return NextResponse.json(
      { error: 'Could not record scan punch.' },
      { status: 500 },
    );
  }
}
