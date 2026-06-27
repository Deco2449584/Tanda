import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/constants';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { mapModulePermissions } from '@/lib/auth/admin-permissions';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';
import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';

const ACCESS_ROLES = new Set<EmployeeAccessRole>([
  'master',
  'admin',
  'kiosk',
  'empleado',
]);

export async function POST(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      employeeDocId?: string;
      accessRole?: EmployeeAccessRole;
      modulePermissions?: AdminModulePermissionsFirestore;
    };

    const employeeDocId = body.employeeDocId?.trim() ?? '';
    const accessRole = body.accessRole;

    if (!employeeDocId || !accessRole || !ACCESS_ROLES.has(accessRole)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const docRef = getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employeeDocId);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (accessRole === 'empleado') {
      update.role = FieldValue.delete();
      update.modulePermissions = FieldValue.delete();
    } else {
      update.role = accessRole;

      if (accessRole === 'admin') {
        update.modulePermissions = mapModulePermissions(body.modulePermissions);
      } else {
        update.modulePermissions = FieldValue.delete();
      }
    }

    await docRef.update(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/employees/admin-access', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Could not update admin access for this employee.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
