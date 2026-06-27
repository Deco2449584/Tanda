import { NextResponse } from 'next/server';
import { mapJustificationDoc } from '@/lib/attendance/map-justification';
import {
  getJustificationById,
  listJustifications,
  submitJustification,
} from '@/lib/attendance/server/attendance-alerts-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { verifyEmployeeRequest } from '@/lib/auth/verify-employee-request';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const type = url.searchParams.get('type') ?? undefined;
    const id = url.searchParams.get('id') ?? undefined;

    const admin = await verifyAdminRequest(request);
    if (admin) {
      if (id) {
        const record = await getJustificationById(id);
        if (!record) {
          return NextResponse.json({ error: 'Not found.' }, { status: 404 });
        }
        return NextResponse.json({
          justification: mapJustificationDoc(
            record.id as string,
            record as Record<string, unknown>,
          ),
        });
      }

      const rows = await listJustifications({ status, type });
      return NextResponse.json({
        justifications: rows.map((row) => mapJustificationDoc(row.id, row.data)),
      });
    }

    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (id) {
      const record = await getJustificationById(id, employee.email);
      if (!record) {
        return NextResponse.json({ error: 'Not found.' }, { status: 404 });
      }
      return NextResponse.json({
        justification: mapJustificationDoc(
          record.id as string,
          record as Record<string, unknown>,
        ),
      });
    }

    const rows = await listJustifications({ employeeEmail: employee.email });
    const filtered = status
      ? rows.filter((row) => row.data.status === status)
      : rows;

    return NextResponse.json({
      justifications: filtered.map((row) => mapJustificationDoc(row.id, row.data)),
    });
  } catch (error) {
    console.error('GET /api/attendance/justifications', error);
    return NextResponse.json(
      { error: 'Could not load justifications.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const employee = await verifyEmployeeRequest(request);
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      justificationId?: string;
      reason?: string;
    };

    const justificationId = body.justificationId?.trim();
    const reason = body.reason?.trim() ?? '';

    if (!justificationId) {
      return NextResponse.json(
        { error: 'Justification ID is required.' },
        { status: 400 },
      );
    }

    await submitJustification({
      employeeEmail: employee.email,
      justificationId,
      reason,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not submit justification.';
    console.error('POST /api/attendance/justifications', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
