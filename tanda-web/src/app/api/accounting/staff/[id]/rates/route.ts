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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;
    const body = (await request.json()) as {
      employmentTypeId?: unknown;
      payRates?: unknown;
      hourlyRate?: unknown;
      payRateHistory?: unknown;
    };

    const docRef = getAdminFirestore().collection(COLLECTIONS.EMPLOYEES).doc(id);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    const payRates = mapStaffPayRates(body.payRates);
    const employmentTypeId =
      typeof body.employmentTypeId === 'string' ? body.employmentTypeId.trim() : '';
    const hourlyFromBody =
      typeof body.hourlyRate === 'number' && Number.isFinite(body.hourlyRate)
        ? body.hourlyRate
        : undefined;
    const hourlyRate =
      hourlyFromBody ??
      baseHourlyRateFromCells(
        payRates?.cells,
        typeof snapshot.data()?.hourlyRate === 'number' ? snapshot.data()!.hourlyRate : 0,
      );

    const payload: Record<string, unknown> = {
      hourlyRate,
    };
    if (employmentTypeId) payload.employmentTypeId = employmentTypeId;
    if (payRates) payload.payRates = sanitizeForFirestore(payRates);
    if (Array.isArray(body.payRateHistory)) {
      payload.payRateHistory = sanitizeForFirestore(
        body.payRateHistory
          .map((item) => mapStaffPayRates(item))
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      );
    }

    await docRef.set(payload, { merge: true });

    await recordAuditFromRequest(request, auth.user, {
      action: 'employee.updated',
      entityType: 'employee',
      entityId: id,
      summary: 'Updated staff pay rates',
      after: payload,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/accounting/staff/[id]/rates', error);
    return NextResponse.json({ error: 'Could not save staff rates.' }, { status: 500 });
  }
}
