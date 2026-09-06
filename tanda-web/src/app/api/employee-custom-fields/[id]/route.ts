import { NextResponse } from 'next/server';
import { verifyAdminActionRequest } from '@/lib/auth/verify-admin-action-request';
import {
  deleteEmployeeCustomField,
  updateEmployeeCustomField,
} from '@/lib/employees/server/employee-custom-fields-admin';
import type { UpdateEmployeeCustomFieldInput } from '@/lib/types/employee-custom-field';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminActionRequest(request, 'settings', 'viewEmployeeFields');
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdateEmployeeCustomFieldInput;
    await updateEmployeeCustomField(id, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/employee-custom-fields/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not update custom field.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await verifyAdminActionRequest(request, 'settings', 'viewEmployeeFields');
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const { id } = await context.params;
    await deleteEmployeeCustomField(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/employee-custom-fields/[id]', error);
    const message =
      error instanceof Error ? error.message : 'Could not delete custom field.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
