import { NextResponse } from 'next/server';
import type { AuditEntityType } from '@/lib/types/audit-log';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

const ALLOWED_EVENTS: Record<string, AuditEntityType> = {
  'employee.created': 'employee',
  'employee.updated': 'employee',
  'employee.deleted': 'employee',
  'shift.created': 'shift',
  'shift.deleted': 'shift',
};

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      action?: string;
      entityId?: string;
      summary?: string;
      before?: Record<string, unknown> | null;
      after?: Record<string, unknown> | null;
      metadata?: Record<string, unknown>;
    };

    const action = body.action?.trim() ?? '';
    const entityId = body.entityId?.trim() ?? '';
    const summary = body.summary?.trim() ?? '';
    const entityType = ALLOWED_EVENTS[action];

    if (!entityType || !entityId || !summary) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    await recordAuditFromRequest(request, admin, {
      action,
      entityType,
      entityId,
      summary,
      before: body.before,
      after: body.after,
      metadata: body.metadata,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/audit/events', error);
    return NextResponse.json({ error: 'Could not record audit event.' }, { status: 500 });
  }
}
