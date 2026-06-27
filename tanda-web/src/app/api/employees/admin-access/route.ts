import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { COLLECTIONS } from '@/lib/constants';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { getAdminRoleById } from '@/lib/admin-roles/server/admin-roles-service';
import { getAdminFirestore } from '@/lib/firebase-admin';
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
      adminRoleId?: string;
    };

    const employeeDocId = body.employeeDocId?.trim() ?? '';
    const accessRole = body.accessRole;
    const adminRoleId = body.adminRoleId?.trim() ?? '';

    if (!employeeDocId || !accessRole || !ACCESS_ROLES.has(accessRole)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    if (accessRole === 'admin' && !adminRoleId) {
      return NextResponse.json(
        { error: 'Select an access role template for administrators.' },
        { status: 400 },
      );
    }

    if (accessRole === 'admin') {
      const template = await getAdminRoleById(adminRoleId);
      if (!template || !template.active) {
        return NextResponse.json({ error: 'Access role not found.' }, { status: 400 });
      }
    }

    const docRef = getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employeeDocId);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const before = snapshot.data() as Record<string, unknown>;

    const update: Record<string, unknown> = {};

    if (accessRole === 'empleado') {
      update.role = FieldValue.delete();
      update.adminRoleId = FieldValue.delete();
      update.modulePermissions = FieldValue.delete();
    } else {
      update.role = accessRole;

      if (accessRole === 'admin') {
        update.adminRoleId = adminRoleId;
        update.modulePermissions = FieldValue.delete();
      } else {
        update.adminRoleId = FieldValue.delete();
        update.modulePermissions = FieldValue.delete();
      }
    }

    await docRef.update(update);

    await recordAuditFromRequest(request, master, {
      action: 'role.permissions_changed',
      entityType: 'employee',
      entityId: employeeDocId,
      summary: `Changed sign-in access to ${accessRole} for ${before.name ?? before.email ?? employeeDocId}`,
      before: {
        role: before.role,
        adminRoleId: before.adminRoleId,
      },
      after: {
        accessRole,
        adminRoleId: accessRole === 'admin' ? adminRoleId : null,
      },
    });

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
