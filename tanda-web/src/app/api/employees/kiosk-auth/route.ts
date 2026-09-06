import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { COLLECTIONS } from '@/lib/constants';
import { normalizeKioskLoginEmail } from '@/lib/employees/normalize-kiosk-login-email';
import { provisionPasswordAuth } from '@/lib/employees/provision-kiosk-employee-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const PASSWORD_AUTH_ROLES = new Set(['kiosk', 'admin', 'master']);

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

    const name = body.name?.trim() ?? '';
    const password = body.password ?? '';
    const employeeDocId = body.employeeDocId?.trim() ?? '';
    const rawEmail = body.email?.trim() ?? '';

    if (!rawEmail || !name || !password || !employeeDocId) {
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

    if (!PASSWORD_AUTH_ROLES.has(role)) {
      return NextResponse.json(
        {
          error:
            'Password sign-in is only available for administrator, master, and kiosk accounts.',
        },
        { status: 400 },
      );
    }

    const email =
      role === 'kiosk' ? normalizeKioskLoginEmail(rawEmail) : rawEmail.toLowerCase();

    const result = await provisionPasswordAuth({
      email,
      name,
      password,
      employeeDocId,
    });

    await recordAuditFromRequest(request, master, {
      action: 'employee.password_auth_provisioned',
      entityType: 'employee',
      entityId: employeeDocId,
      summary: `Set sign-in password for ${email} (${role})`,
      metadata: { email, name, role },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/employees/kiosk-auth', error);
    const message =
      error instanceof Error ? error.message : 'Could not set the sign-in password.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
