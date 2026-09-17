import { NextResponse } from 'next/server';
import { loadDataPurgeStats } from '@/lib/admin/data-purge-stats-admin';
import type { DataPurgeDateRange } from '@/lib/admin/data-purge';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';

export async function GET(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const dateRange: DataPurgeDateRange = {
      startDate: url.searchParams.get('startDate')?.trim() ?? '',
      endDate: url.searchParams.get('endDate')?.trim() ?? '',
    };

    const stats = await loadDataPurgeStats(dateRange);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('GET /api/admin/data-purge/stats', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not load data stats.',
      },
      { status: 500 },
    );
  }
}
