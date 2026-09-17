import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { purgeOperationalDataAdmin } from '@/lib/admin/data-purge-admin';
import type { DataPurgeDateRange, DataPurgeOptions } from '@/lib/admin/data-purge';

export async function POST(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      options?: DataPurgeOptions;
      dateRange?: DataPurgeDateRange;
    };
    if (!body.options) {
      return NextResponse.json({ error: 'Missing purge options.' }, { status: 400 });
    }

    const dateRange: DataPurgeDateRange = {
      startDate: body.dateRange?.startDate?.trim() ?? '',
      endDate: body.dateRange?.endDate?.trim() ?? '',
    };

    const progress: string[] = [];
    const result = await purgeOperationalDataAdmin(
      body.options,
      (message) => {
        progress.push(message);
      },
      dateRange,
      master.email,
    );

    await recordAuditFromRequest(request, master, {
      action: 'system.data_purged',
      entityType: 'system',
      summary: dateRange.startDate || dateRange.endDate
        ? `Ran operational data cleanup (${dateRange.startDate || '…'} → ${dateRange.endDate || '…'})`
        : 'Ran operational data cleanup',
      metadata: { options: body.options, dateRange, result },
    });

    return NextResponse.json({ result, progress });
  } catch (error) {
    console.error('POST /api/admin/data-purge', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Cleanup failed.',
      },
      { status: 500 },
    );
  }
}
