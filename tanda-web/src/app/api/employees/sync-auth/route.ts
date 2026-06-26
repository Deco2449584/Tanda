import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import {
  deleteEmployeeAuth,
  disableEmployeeAuth,
  enableEmployeeAuth,
} from '@/lib/employees/sync-employee-auth';

const ACTIONS = new Set(['disable', 'enable', 'delete']);

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      employeeDocId?: string;
      action?: string;
    };

    const employeeDocId = body.employeeDocId?.trim() ?? '';
    const action = body.action?.trim() ?? '';

    if (!employeeDocId || !ACTIONS.has(action)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    if (action === 'disable') {
      await disableEmployeeAuth(employeeDocId);
    } else if (action === 'enable') {
      await enableEmployeeAuth(employeeDocId);
    } else {
      await deleteEmployeeAuth(employeeDocId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/employees/sync-auth', error);
    const message =
      error instanceof Error ? error.message : 'Could not update authentication access.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
