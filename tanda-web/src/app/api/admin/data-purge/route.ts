import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/verify-admin-request';
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
