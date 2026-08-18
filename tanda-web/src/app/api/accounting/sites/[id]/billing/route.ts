import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { requireAccountingAccess } from '@/lib/accounting/server/require-accounting-access';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { mapSiteBilling } from '@/lib/payroll/map-pay-rules';

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAccountingAccess(request, 'updateRates');
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = (await request.json()) as { billing?: unknown; billingHistory?: unknown };
    const billing = sanitizeForFirestore(mapSiteBilling(body.billing) ?? {});

    const docRef = getAdminFirestore().collection(COLLECTIONS.LOCATIONS).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 });
    }

    const payload: Record<string, unknown> = { billing };
    if (Array.isArray(body.billingHistory)) {
      payload.billingHistory = sanitizeForFirestore(
        body.billingHistory
          .map((item) => mapSiteBilling(item))
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      );
    }

    await docRef.set(payload, { merge: true });

    await recordAuditFromRequest(request, auth.user, {
      action: 'settings.changed',
      entityType: 'settings',
      entityId: id,
      summary: 'Updated site billing rates',
      after: billing as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ ok: true, billing });
  } catch (error) {
    console.error('PUT /api/accounting/sites/[id]/billing', error);
    return NextResponse.json({ error: 'Could not save site billing.' }, { status: 500 });
  }
}
