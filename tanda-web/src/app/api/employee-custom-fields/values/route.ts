import { NextResponse } from 'next/server';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { loadEmployeeContext } from '@/lib/auth/load-employee-context';
import {
  listEmployeeCustomFieldValues,
  upsertEmployeeCustomFieldValues,
} from '@/lib/employees/server/employee-custom-fields-admin';
import type { UpsertEmployeeCustomFieldValueInput } from '@/lib/types/employee-custom-field';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeDocId = url.searchParams.get('employeeDocId')?.trim() ?? '';

    const [employee, admin] = await Promise.all([
      loadEmployeeContext(request),
      loadAdminAccessFromRequest(request),
    ]);

    if (!employee && !admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let targetDocId = employeeDocId;
    if (admin && canPerformAction(admin.access, 'employees', 'update') && employeeDocId) {
      targetDocId = employeeDocId;
    } else if (employee) {
      targetDocId = employee.employeeDocId;
    } else if (admin && canPerformAction(admin.access, 'employees', 'update')) {
      return NextResponse.json(
        { error: 'employeeDocId is required.' },
        { status: 400 },
      );
    } else {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const values = await listEmployeeCustomFieldValues(targetDocId);
    return NextResponse.json({ values });
  } catch (error) {
    console.error('GET /api/employee-custom-fields/values', error);
    return NextResponse.json({ error: 'Could not load field values.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      employeeDocId?: string;
      values?: UpsertEmployeeCustomFieldValueInput[];
    };

    const values = Array.isArray(body.values) ? body.values : [];
    if (values.length === 0) {
      return NextResponse.json({ error: 'No values to save.' }, { status: 400 });
    }

    const [employee, admin] = await Promise.all([
      loadEmployeeContext(request),
      loadAdminAccessFromRequest(request),
    ]);

    if (!employee && !admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    let employeeDocId = '';
    let updatedByUid = '';
    let updatedByEmail = '';

    if (admin && canPerformAction(admin.access, 'employees', 'update')) {
      employeeDocId = body.employeeDocId?.trim() ?? '';
      if (!employeeDocId) {
        return NextResponse.json(
          { error: 'employeeDocId is required.' },
          { status: 400 },
        );
      }
      updatedByUid = admin.user.uid;
      updatedByEmail = admin.user.email;
    } else if (employee) {
      employeeDocId = employee.employeeDocId;
      updatedByUid = employee.uid;
      updatedByEmail = employee.email;
    } else {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    await upsertEmployeeCustomFieldValues({
      employeeDocId,
      values,
      updatedByUid,
      updatedByEmail,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/employee-custom-fields/values', error);
    const message =
      error instanceof Error ? error.message : 'Could not save field values.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
