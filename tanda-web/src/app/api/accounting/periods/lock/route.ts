import { NextResponse } from 'next/server';
import { requireAccountingAccess } from '@/lib/accounting/server/require-accounting-access';
import { periodLockId, type AccountingPeriodLock } from '@/lib/accounting/period-lock';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { canPerformAction } from '@/lib/auth/admin-action-permissions';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { AwardReport } from '@/lib/payroll/award-calc';

function readRange(request: Request, body?: { start?: unknown; end?: unknown }) {
  const url = new URL(request.url);
  const start =
    (typeof body?.start === 'string' ? body.start : null) ?? url.searchParams.get('start') ?? '';
  const end =
    (typeof body?.end === 'string' ? body.end : null) ?? url.searchParams.get('end') ?? '';
  return { start, end };
}

function mapLock(id: string, data: Record<string, unknown>): AccountingPeriodLock {
  return {
    start: typeof data.start === 'string' ? data.start : id.split('_')[0] ?? '',
    end: typeof data.end === 'string' ? data.end : id.split('_').slice(1).join('_'),
    lockedAt: typeof data.lockedAt === 'string' ? data.lockedAt : '',
    lockedBy: typeof data.lockedBy === 'string' ? data.lockedBy : '',
    snapshot: data.snapshot as AwardReport,
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireAccountingAccess(request);
    if (!auth.ok) return auth.response;

    const { start, end } = readRange(request);
    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
    }

    const snapshot = await getAdminFirestore()
      .collection(COLLECTIONS.ACCOUNTING_PERIOD_LOCKS)
      .doc(periodLockId(start, end))
      .get();

    if (!snapshot.exists) {
      return NextResponse.json({ lock: null });
    }

    return NextResponse.json({ lock: mapLock(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>) });
  } catch (error) {
    console.error('GET /api/accounting/periods/lock', error);
    return NextResponse.json({ error: 'Could not load period lock.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAccountingAccess(request);
    if (!auth.ok) return auth.response;

    const canLock =
      canPerformAction(auth.access, 'accounting', 'export') ||
      canPerformAction(auth.access, 'accounting', 'updateRules');
    if (!canLock) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const body = (await request.json()) as {
      start?: unknown;
      end?: unknown;
      snapshot?: unknown;
    };
    const { start, end } = readRange(request, body);
    if (!start || !end || start > end) {
      return NextResponse.json({ error: 'Valid start and end dates are required.' }, { status: 400 });
    }
    if (!body.snapshot || typeof body.snapshot !== 'object') {
      return NextResponse.json({ error: 'A report snapshot is required to close the week.' }, { status: 400 });
    }

    const lock: AccountingPeriodLock = {
      start,
      end,
      lockedAt: new Date().toISOString(),
      lockedBy: auth.user.email,
      snapshot: JSON.parse(JSON.stringify(body.snapshot)) as AwardReport,
    };

    await getAdminFirestore()
      .collection(COLLECTIONS.ACCOUNTING_PERIOD_LOCKS)
      .doc(periodLockId(start, end))
      .set(lock);

    await recordAuditFromRequest(request, auth.user, {
      action: 'settings.changed',
      entityType: 'settings',
      entityId: periodLockId(start, end),
      summary: `Closed accounting period ${start} to ${end}`,
    });

    return NextResponse.json({ ok: true, lock });
  } catch (error) {
    console.error('POST /api/accounting/periods/lock', error);
    return NextResponse.json({ error: 'Could not close this period.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAccountingAccess(request, 'updateRules');
    if (!auth.ok) return auth.response;

    const body = (await request.json().catch(() => ({}))) as {
      start?: unknown;
      end?: unknown;
    };
    const { start, end } = readRange(request, body);
    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end dates are required.' }, { status: 400 });
    }

    await getAdminFirestore()
      .collection(COLLECTIONS.ACCOUNTING_PERIOD_LOCKS)
      .doc(periodLockId(start, end))
      .delete();

    await recordAuditFromRequest(request, auth.user, {
      action: 'settings.changed',
      entityType: 'settings',
      entityId: periodLockId(start, end),
      summary: `Reopened accounting period ${start} to ${end}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/accounting/periods/lock', error);
    return NextResponse.json({ error: 'Could not reopen this period.' }, { status: 500 });
  }
}
