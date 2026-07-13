import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

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

    if (body.status !== 'Approved' && body.status !== 'Rejected') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const docRef = getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const data = existing.data() ?? {};
    if (data.personalProfileStatus !== 'Pending') {
      return NextResponse.json(
        { error: 'Only pending profiles can be approved or rejected.' },
        { status: 400 },
      );
    }

    const rejectionReason =
      typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';

    if (body.status === 'Rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'A rejection reason is required.' },
        { status: 400 },
      );
    }

    const payload: Record<string, unknown> = {
      personalProfileStatus: body.status,
      personalProfileReviewedAt: FieldValue.serverTimestamp(),
    };

    if (body.status === 'Rejected') {
      payload.personalProfileRejectionReason = rejectionReason;
    } else {
      payload.personalProfileRejectionReason = FieldValue.delete();
    }

    await docRef.update(payload);

    const employeeCode =
      typeof data.employeeId === 'string' ? data.employeeId : id;
    const employeeName = typeof data.name === 'string' ? data.name : employeeCode;

    await recordAuditFromRequest(request, authContext.user, {
      action:
        body.status === 'Approved'
          ? 'employee.profile_approved'
          : 'employee.profile_rejected',
      entityType: 'employee',
      entityId: id,
      summary: `${body.status === 'Approved' ? 'Approved' : 'Rejected'} personal profile for ${employeeName} (${employeeCode})`,
      before: { personalProfileStatus: data.personalProfileStatus },
      after: {
        personalProfileStatus: body.status,
        ...(body.status === 'Rejected'
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
