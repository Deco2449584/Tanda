import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { COLLECTIONS } from '@/lib/constants';
import { provisionKioskEmployeeAuth } from '@/lib/employees/provision-kiosk-employee-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      employeeDocId?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const password = body.password ?? '';
    const employeeDocId = body.employeeDocId?.trim() ?? '';

    if (!email || !name || !password || !employeeDocId) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }

    const snapshot = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(employeeDocId)
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const data = snapshot.data() ?? {};
    const role = resolveRoleFromEmployee({
      role: typeof data.role === 'string' ? data.role : undefined,
      department: typeof data.department === 'string' ? data.department : undefined,
    });

    if (role !== 'kiosk') {
      return NextResponse.json(
        { error: 'Password sign-in is only available for kiosk device accounts.' },
        { status: 400 },
      );
    }

    const result = await provisionKioskEmployeeAuth({
      email,
      name,
      password,
      employeeDocId,
    });

    await recordAuditFromRequest(request, master, {
      action: 'employee.kiosk_auth_provisioned',
      entityType: 'employee',
      entityId: employeeDocId,
      summary: `Set kiosk sign-in password for ${email}`,
      metadata: { email, name },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/employees/kiosk-auth', error);
    const message =
      error instanceof Error ? error.message : 'Could not set the kiosk sign-in password.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
