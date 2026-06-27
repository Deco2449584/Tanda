import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import {
  deleteAdminRole,
  getAdminRoleById,
  updateAdminRole,
} from '@/lib/admin-roles/server/admin-roles-service';
import type { UpdateAdminRoleInput } from '@/lib/types/admin-role';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const before = await getAdminRoleById(id);
    const body = (await request.json()) as UpdateAdminRoleInput;
    const role = await updateAdminRole(id, body);

    await recordAuditFromRequest(request, master, {
      action: 'role.updated',
      entityType: 'admin_role',
      entityId: id,
      summary: `Updated access role "${role.name}"`,
      before: before ? { name: before.name, active: before.active } : null,
      after: { name: role.name, active: role.active },
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('PATCH /api/admin-roles/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not update access role.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = await context.params;
    const before = await getAdminRoleById(id);
    await deleteAdminRole(id);

    await recordAuditFromRequest(request, master, {
      action: 'role.deleted',
      entityType: 'admin_role',
      entityId: id,
      summary: `Deleted access role "${before?.name ?? id}"`,
      before: before ? { name: before.name, active: before.active } : null,
      after: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin-roles/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete access role.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
