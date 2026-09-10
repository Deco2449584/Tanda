import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

const REVIEW_STATUSES = new Set(['Pending', 'Approved', 'Rejected']);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await loadAdminAccessFromRequest(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canPerformAction(authContext.access, 'employees', 'reviewProfile')) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: string;
      rejectionReason?: string;
    };

    if (!body.status || !REVIEW_STATUSES.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const nextStatus = body.status as 'Pending' | 'Approved' | 'Rejected';

    const docRef = getAdminDb().collection(COLLECTIONS.EMPLOYEES).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const data = existing.data() ?? {};
    const previousStatus =
      typeof data.personalProfileStatus === 'string'
        ? data.personalProfileStatus
        : 'none';

    if (previousStatus === nextStatus) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const rejectionReason =
      typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';

    if (nextStatus === 'Rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'A rejection reason is required.' },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      personalProfileStatus: nextStatus,
      personalProfileReviewedAt: FieldValue.serverTimestamp(),
    };

    if (nextStatus === 'Rejected') {
      payload.personalProfileRejectionReason = rejectionReason;
    } else {
      payload.personalProfileRejectionReason = FieldValue.delete();
    }

    await docRef.update(payload);

    const employeeCode =
      typeof data.employeeId === 'string' ? data.employeeId : id;
    const employeeName = typeof data.name === 'string' ? data.name : employeeCode;

    const actionByStatus = {
      Approved: 'employee.profile_approved',
      Rejected: 'employee.profile_rejected',
      Pending: 'employee.profile_status_changed',
    } as const;

    await recordAuditFromRequest(request, authContext.user, {
      action: actionByStatus[nextStatus],
      entityType: 'employee',
      entityId: id,
      summary: `Changed personal profile status for ${employeeName} (${employeeCode}) from ${previousStatus} to ${nextStatus}`,
      before: { personalProfileStatus: previousStatus },
      after: {
        personalProfileStatus: nextStatus,
        ...(nextStatus === 'Rejected'
          ? { personalProfileRejectionReason: rejectionReason }
          : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/employee-profile/[id]/review', error);
    return NextResponse.json(
      { error: 'Could not review personal profile.' },
      { status: 500 },
    );
  }
}
