import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import {
  deleteLeaveRequestAdmin,
  getLeaveRequestSnapshot,
  updateLeaveRequestAdmin,
  updateLeaveRequestStatusAdmin,
} from '@/lib/leave-requests/server/leave-requests-admin';
import type { UpdateLeaveRequestInput } from '@/lib/types/leave-request';

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
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { access, user: admin } = authContext;
    const { id } = await context.params;
    const body = (await request.json()) as UpdateLeaveRequestInput & {
      status?: string;
    };

    const existing = await getLeaveRequestSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    const isStatusOnly =
      body.status !== undefined &&
      body.type === undefined &&
      body.startDate === undefined &&
      body.endDate === undefined &&
      body.justification === undefined;

    if (isStatusOnly) {
      if (!canPerformAction(access, 'leaveRequests', 'manage')) {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }

      if (body.status !== 'Approved' && body.status !== 'Rejected') {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }

      if (existing.data.status !== 'Pending') {
        return NextResponse.json(
          { error: 'Only pending requests can be approved or rejected.' },
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
    }

    if (!canPerformAction(access, 'leaveRequests', 'update')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    if (body.startDate && body.endDate && body.startDate > body.endDate) {
      return NextResponse.json({ error: 'Invalid date range.' }, { status: 400 });
    }

    await updateLeaveRequestAdmin(id, body);

    await recordAuditFromRequest(request, admin, {
      action: 'leave_request.updated',
      entityType: 'leave_request',
      entityId: id,
      summary: `Updated leave request for ${String(existing.data.employeeId ?? 'employee')}`,
      before: pickLeaveAuditSnapshot(existing.data),
      after: pickLeaveAuditSnapshot({ ...existing.data, ...body }),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/leave-requests/[id]', error);
    return NextResponse.json({ error: 'Could not update leave request.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'leaveRequests', 'delete')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await getLeaveRequestSnapshot(id);
    if (!existing) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    await deleteLeaveRequestAdmin(id);

    await recordAuditFromRequest(request, authContext.user, {
      action: 'leave_request.deleted',
      entityType: 'leave_request',
      entityId: id,
      summary: `Deleted leave request for ${String(existing.data.employeeId ?? 'employee')}`,
      before: pickLeaveAuditSnapshot(existing.data),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/leave-requests/[id]', error);
    return NextResponse.json({ error: 'Could not delete leave request.' }, { status: 500 });
  }
}
