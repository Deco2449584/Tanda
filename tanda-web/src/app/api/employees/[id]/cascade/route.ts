import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminActionRequest } from '@/lib/auth/verify-admin-action-request';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { COLLECTIONS } from '@/lib/constants';
import {
  executeEmployeeCascadeDelete,
  previewEmployeeCascadeDelete,
} from '@/lib/employees/server/employee-cascade-delete';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';

type RouteContext = { params: Promise<{ id: string }> };

async function assertCanDeleteEmployee(
  request: Request,
  employeeDocId: string,
): Promise<{ email: string; uid: string } | { error: string; status: number }> {
  const admin = await verifyAdminActionRequest(request, 'employees', 'delete');
  if (!admin) {
    return { error: 'Unauthorized.', status: 401 };
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeDocId)
    .get();

  if (!snapshot.exists) {
    return { error: 'Employee not found.', status: 404 };
  }

  const data = snapshot.data() ?? {};
  const targetRole = resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });

  if (targetRole === 'master') {
    return { error: 'Master accounts cannot be deleted.', status: 403 };
  }

  if (targetRole === 'admin') {
    const context = await loadAdminAccessFromRequest(request);
    if (!context?.access.isMaster) {
      return {
        error: 'Only a Master can delete administrator accounts.',
        status: 403,
      };
    }
  }

  return admin;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await assertCanDeleteEmployee(request, id);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const preview = await previewEmployeeCascadeDelete(id);
    return NextResponse.json({ preview });
  } catch (error) {
    console.error('GET /api/employees/[id]/cascade', error);
    const message =
      error instanceof Error ? error.message : 'Could not load delete preview.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await assertCanDeleteEmployee(request, id);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const preview = await executeEmployeeCascadeDelete(id);

    await recordAuditFromRequest(request, auth, {
      action: 'employee.deleted',
      entityType: 'employee',
      entityId: id,
      summary: `Cascade-deleted employee ${preview.name} (${preview.employeeId})`,
      metadata: {
        items: preview.items,
        totalDeletedDocs: preview.totalDeletedDocs,
      },
    });

    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    console.error('DELETE /api/employees/[id]/cascade', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete employee.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
