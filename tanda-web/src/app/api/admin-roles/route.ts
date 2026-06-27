import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import {
  createAdminRole,
  listAdminRoles,
} from '@/lib/admin-roles/server/admin-roles-service';
import type { CreateAdminRoleInput } from '@/lib/types/admin-role';

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const roles = await listAdminRoles();
    return NextResponse.json({ roles });
  } catch (error) {
    console.error('GET /api/admin-roles', error);
    return NextResponse.json(
      { error: 'Could not load access roles.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as CreateAdminRoleInput;
    const role = await createAdminRole(body);

    return NextResponse.json({ role });
  } catch (error) {
    console.error('POST /api/admin-roles', error);
    const message =
      error instanceof Error ? error.message : 'Could not create access role.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
