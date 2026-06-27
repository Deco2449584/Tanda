import { NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/audit/server/audit-log-service';
import { verifyMasterRequest } from '@/lib/auth/verify-master-request';
import type { AuditEntityType } from '@/lib/types/audit-log';

function toCsvValue(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const master = await verifyMasterRequest(request);
    if (!master) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    const entityType = url.searchParams.get('entityType') as AuditEntityType | null;

    const logs = await listAuditLogs({
      startDate: url.searchParams.get('startDate') ?? undefined,
      endDate: url.searchParams.get('endDate') ?? undefined,
      actionPrefix: url.searchParams.get('actionPrefix') ?? undefined,
      entityType:
        entityType &&
        [
          'attendance_record',
          'employee',
          'settings',
          'admin_role',
          'shift',
          'announcement',
          'leave_request',
          'system',
        ].includes(entityType)
          ? entityType
          : undefined,
      actorEmail: url.searchParams.get('actorEmail') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      limit: Number(url.searchParams.get('limit') ?? '200'),
    });

    if (format === 'csv') {
      const header = [
        'timestamp',
        'actorEmail',
        'action',
        'entityType',
        'entityId',
        'summary',
        'ipAddress',
      ].join(',');

      const rows = logs.map((log) =>
        [
          new Date(log.createdAt).toISOString(),
          log.actorEmail,
          log.action,
          log.entityType,
          log.entityId ?? '',
          log.summary,
          log.ipAddress ?? '',
        ]
          .map(toCsvValue)
          .join(','),
      );

      const csv = [header, ...rows].join('\n');
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"',
        },
      });
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('GET /api/audit-logs', error);
    return NextResponse.json({ error: 'Could not load audit logs.' }, { status: 500 });
  }
}
