import { NextResponse } from 'next/server';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import {
  deleteAdminRole,
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
    const body = (await request.json()) as UpdateAdminRoleInput;
    const role = await updateAdminRole(id, body);

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
    await deleteAdminRole(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin-roles/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete access role.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
