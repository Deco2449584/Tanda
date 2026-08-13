import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { requireAccountingAccess } from '@/lib/accounting/server/require-accounting-access';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { mapPayRules } from '@/lib/payroll/map-pay-rules';
import { DEFAULT_PAYROLL_ACCOUNTING } from '@/lib/types/company-settings';

const SETTINGS_DOC_ID = 'general';

export async function GET(request: Request) {
  try {
    const auth = await requireAccountingAccess(request);
    if (!auth.ok) return auth.response;

    const snapshot = await getAdminFirestore()
      .collection(COLLECTIONS.SETTINGS)
      .doc(SETTINGS_DOC_ID)
      .get();
    const data = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : {};
    const payrollAccounting =
      data.payrollAccounting && typeof data.payrollAccounting === 'object'
        ? (data.payrollAccounting as typeof DEFAULT_PAYROLL_ACCOUNTING)
        : DEFAULT_PAYROLL_ACCOUNTING;

    return NextResponse.json({
      rules: mapPayRules(data.payRules, payrollAccounting),
    });
  } catch (error) {
    console.error('GET /api/accounting/rules', error);
    return NextResponse.json({ error: 'Could not load pay rules.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAccountingAccess(request, 'updateRules');
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as { rules?: unknown };
    const rules = mapPayRules(body.rules);

    const docRef = getAdminFirestore().collection(COLLECTIONS.SETTINGS).doc(SETTINGS_DOC_ID);
    const beforeSnapshot = await docRef.get();
    const before = beforeSnapshot.exists
      ? (beforeSnapshot.data() as Record<string, unknown>)
      : null;

    await docRef.set({ payRules: rules }, { merge: true });

    await recordAuditFromRequest(request, auth.user, {
      action: 'settings.changed',
      entityType: 'settings',
      entityId: SETTINGS_DOC_ID,
      summary: 'Updated accounting pay rules',
      before: before?.payRules as Record<string, unknown> | undefined,
      after: rules as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true, rules });
  } catch (error) {
    console.error('PUT /api/accounting/rules', error);
    return NextResponse.json({ error: 'Could not save pay rules.' }, { status: 500 });
  }
}
