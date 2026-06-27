import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

const ALLOWED_ACTIONS = new Set([
  'employee.created',
  'employee.updated',
  'employee.deleted',
]);

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: string;
      employeeDocId?: string;
      summary?: string;
      metadata?: Record<string, unknown>;
    };

    const action = body.action?.trim() ?? '';
    const employeeDocId = body.employeeDocId?.trim() ?? '';
    const summary = body.summary?.trim() ?? '';

    if (!ALLOWED_ACTIONS.has(action) || !employeeDocId || !summary) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    await recordAuditFromRequest(request, admin, {
      action,
      entityType: 'employee',
      entityId: employeeDocId,
      summary,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/audit/events', error);
    return NextResponse.json({ error: 'Could not record audit event.' }, { status: 500 });
  }
}
