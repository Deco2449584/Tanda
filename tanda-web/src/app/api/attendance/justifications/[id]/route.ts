import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import {
  acknowledgeJustification,
  getJustificationById,
  reviewJustification,
} from '@/lib/attendance/server/attendance-alerts-service';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function pickJustificationAuditSnapshot(data: Record<string, unknown>) {
  return {
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    date: data.date,
    type: data.type,
    status: data.status,
    reason: data.reason,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const beforeRecord = await getJustificationById(id);
    if (!beforeRecord) {
      return NextResponse.json({ error: 'Justification not found.' }, { status: 404 });
    }

    const body = (await request.json()) as {
      status?: 'approved' | 'rejected';
      reviewerNote?: string;
      acknowledge?: boolean;
    };

    if (body.acknowledge === true) {
      await acknowledgeJustification({
        justificationId: id,
        adminEmail: admin.email,
      });

      await recordAuditFromRequest(request, admin, {
        action: 'justification.acknowledged',
        entityType: 'system',
        entityId: id,
        summary: `Marked ${beforeRecord.type === 'no_show' ? 'no-show' : 'late'} justification as reviewed for ${String(beforeRecord.employeeName ?? beforeRecord.employeeId)}`,
        before: pickJustificationAuditSnapshot(beforeRecord),
        after: pickJustificationAuditSnapshot({
          ...beforeRecord,
          adminAcknowledgedByEmail: admin.email,
        }),
      });

      return NextResponse.json({ ok: true });
    }

    if (body.status !== 'approved' && body.status !== 'rejected') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    await reviewJustification({
      justificationId: id,
      status: body.status,
      reviewerEmail: admin.email,
      reviewerNote: body.reviewerNote,
    });

    await recordAuditFromRequest(request, admin, {
      action: `justification.${body.status}`,
      entityType: 'system',
      entityId: id,
      summary: `${body.status === 'approved' ? 'Approved' : 'Rejected'} no-show justification for ${String(beforeRecord.employeeName ?? beforeRecord.employeeId)}`,
      before: pickJustificationAuditSnapshot(beforeRecord),
      after: pickJustificationAuditSnapshot({
        ...beforeRecord,
        status: body.status,
        reviewedByEmail: admin.email,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not review justification.';
    console.error('PATCH /api/attendance/justifications/[id]', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
