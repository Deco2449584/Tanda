import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { inviteEmployeeAuth } from '@/lib/employees/invite-employee-auth';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      email?: string;
      name?: string;
      employeeDocId?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? '';
    const name = body.name?.trim() ?? '';
    const employeeDocId = body.employeeDocId?.trim();

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required.' }, { status: 400 });
    }

    const result = await inviteEmployeeAuth({ email, name, employeeDocId });

    await recordAuditFromRequest(request, admin, {
      action: 'employee.invite_sent',
      entityType: 'employee',
      entityId: employeeDocId,
      summary: `Sent sign-in invite to ${email}`,
      metadata: { email, name },
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('POST /api/employees/invite', error);
    const message =
      error instanceof Error ? error.message : 'Could not send the employee invite.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
