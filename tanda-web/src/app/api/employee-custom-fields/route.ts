import { NextResponse } from 'next/server';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import {
  createEmployeeCustomField,
  listEmployeeCustomFields,
} from '@/lib/employees/server/employee-custom-fields-admin';
import { isEmployeeCustomFieldType } from '@/lib/employees/map-employee-custom-field';
import type { CreateEmployeeCustomFieldInput } from '@/lib/types/employee-custom-field';

export async function GET(request: Request) {
  try {
    const [employee, admin] = await Promise.all([
      loadEmployeeContext(request),
      loadAdminAccessFromRequest(request),
    ]);

    if (!employee && !admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const isMaster = admin?.access.isMaster === true;

    const fields = await listEmployeeCustomFields({
      activeOnly: !(isMaster && includeInactive),
    });

    return NextResponse.json({ fields });
  } catch (error) {
    console.error('GET /api/employee-custom-fields', error);
    return NextResponse.json({ error: 'Could not load custom fields.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = (await request.json()) as CreateEmployeeCustomFieldInput;
    if (!isEmployeeCustomFieldType(body.type)) {
      return NextResponse.json({ error: 'Invalid field type.' }, { status: 400 });
    }

    const id = await createEmployeeCustomField(body);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/employee-custom-fields', error);
    const message =
      error instanceof Error ? error.message : 'Could not create custom field.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
