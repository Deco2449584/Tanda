import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import {
  getLeaveRequestSnapshot,
  updateLeaveRequestStatusAdmin,
} from '@/lib/leave-requests/server/leave-requests-admin';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';

function pickLeaveAuditSnapshot(data: Record<string, unknown>) {
  return {
    employeeId: data.employeeId,
    startDate: data.startDate,
    endDate: data.endDate,
    type: data.type,
    status: data.status,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as { status?: string };

    if (body.status !== 'Approved' && body.status !== 'Rejected') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const existing = await getLeaveRequestSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    if (existing.data.status !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending requests can be updated.' },
        { status: 400 },
      );
    }

    await updateLeaveRequestStatusAdmin(id, body.status);

    const employeeId = String(existing.data.employeeId ?? 'employee');
    const leaveType = String(existing.data.type ?? 'leave');
    const dateRange = `${existing.data.startDate ?? ''} – ${existing.data.endDate ?? ''}`;

    await recordAuditFromRequest(request, admin, {
      action:
        body.status === 'Approved' ? 'leave_request.approved' : 'leave_request.rejected',
      entityType: 'leave_request',
      entityId: id,
      summary: `${body.status === 'Approved' ? 'Approved' : 'Rejected'} ${leaveType} for ${employeeId} (${dateRange})`,
      before: pickLeaveAuditSnapshot(existing.data),
      after: pickLeaveAuditSnapshot({ ...existing.data, status: body.status }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/leave-requests/[id]', error);
    return NextResponse.json({ error: 'Could not update leave request.' }, { status: 500 });
  }
}
