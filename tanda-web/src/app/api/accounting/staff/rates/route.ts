import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { loadAdminAccessFromRequest } from '@/lib/auth/load-admin-access';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { mapStaffPayRates } from '@/lib/payroll/map-pay-rules';
import { baseHourlyRateFromCells } from '@/lib/payroll/rate-matrix';

function sanitizeForFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function POST(request: Request) {
  try {
    const auth = await loadAdminAccessFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const canRates =
      canPerformAction(auth.access, 'accounting', 'updateRates') ||
      canPerformAction(auth.access, 'employees', 'update');
    if (!canRates) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = (await request.json()) as {
      ids?: unknown;
      employmentTypeId?: unknown;
      payRates?: unknown;
      hourlyRate?: unknown;
    };

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Select at least one employee.' }, { status: 400 });
    }

    const payRates = mapStaffPayRates(body.payRates);
    const employmentTypeId =
      typeof body.employmentTypeId === 'string' ? body.employmentTypeId.trim() : '';
    const hourlyFromBody =
      typeof body.hourlyRate === 'number' && Number.isFinite(body.hourlyRate)
        ? body.hourlyRate
        : undefined;

    const db = getAdminFirestore();
    const batch = db.batch();
    let updated = 0;

    for (const id of ids) {
      const docRef = db.collection(COLLECTIONS.EMPLOYEES).doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) continue;
      const hourlyRate =
        hourlyFromBody ??
        baseHourlyRateFromCells(
          payRates?.cells,
          typeof snapshot.data()?.hourlyRate === 'number' ? snapshot.data()!.hourlyRate : 0,
        );
      const payload: Record<string, unknown> = { hourlyRate };
      if (employmentTypeId) payload.employmentTypeId = employmentTypeId;
      if (payRates) payload.payRates = sanitizeForFirestore(payRates);
      batch.set(docRef, payload, { merge: true });
      updated += 1;
    }

    await batch.commit();

    await recordAuditFromRequest(request, auth.user, {
      action: 'employee.updated',
      entityType: 'employee',
      entityId: ids.join(','),
      summary: `Applied pay rates to ${updated} staff`,
      after: { ids, employmentTypeId, hourlyRate: hourlyFromBody },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error('POST /api/accounting/staff/rates', error);
    return NextResponse.json({ error: 'Could not apply staff rates.' }, { status: 500 });
  }
}
