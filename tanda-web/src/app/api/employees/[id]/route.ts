import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminActionRequest } from '@/lib/auth/verify-admin-action-request';
import { COLLECTIONS } from '@/lib/constants';
import { buildAdminEmployeeUpdate } from '@/lib/employees/server/sanitize-employee-update';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { canEditStaffAccount } from '@/lib/employees/is-protected-admin';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const admin = await verifyAdminActionRequest(request, 'employees', 'update');
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      fields?: Record<string, unknown>;
      deleteFields?: string[];
    } | null;

    if (!body || (typeof body.fields !== 'object' && !Array.isArray(body.deleteFields))) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const docRef = getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const data = snapshot.data() ?? {};
    const accessContext = await loadAdminAccessFromRequest(request);
    const viewerIsMaster = accessContext?.access.isMaster === true;

    if (!canEditStaffAccount(viewerIsMaster, data)) {
      return NextResponse.json(
        { error: 'You cannot edit this account.' },
        { status: 403 },
      );
    }

    const update = buildAdminEmployeeUpdate({
      fields: body.fields,
      deleteFields: body.deleteFields,
    });

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
    }

    // Prevent demoting/deactivating master via this route.
    const targetRole = resolveRoleFromEmployee({
      role: typeof data.role === 'string' ? data.role : undefined,
      department: typeof data.department === 'string' ? data.department : undefined,
    });
    if (targetRole === 'master' && update.active === false) {
      return NextResponse.json(
        { error: 'Master accounts cannot be deactivated.' },
        { status: 403 },
      );
    }

    await docRef.update(update);

    await recordAuditFromRequest(request, admin, {
      action: 'employee.updated',
      entityType: 'employee',
      entityId: id,
      summary: `Updated employee fields (${Object.keys(update).join(', ')})`,
      metadata: {
        fields: Object.keys(update),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/employees/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not update employee.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
