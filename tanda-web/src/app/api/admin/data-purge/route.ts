import { NextResponse } from 'next/server';
import { recordAuditFromRequest } from '@/lib/audit/server/record-audit-from-request';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import { purgeOperationalDataAdmin } from '@/lib/admin/data-purge-admin';
import type { DataPurgeOptions } from '@/lib/admin/data-purge';

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = (await request.json()) as { options?: DataPurgeOptions };
    if (!body.options) {
      return NextResponse.json({ error: 'Missing purge options.' }, { status: 400 });
    }

    const progress: string[] = [];
    const result = await purgeOperationalDataAdmin(body.options, (message) => {
      progress.push(message);
    });

    await recordAuditFromRequest(request, admin, {
      action: 'system.data_purged',
      entityType: 'system',
      summary: 'Ran operational data cleanup',
      metadata: { options: body.options, result },
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
