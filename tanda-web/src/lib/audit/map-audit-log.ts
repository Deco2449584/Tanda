import type { AuditLog } from '@/lib/types/audit-log';

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalObject(value: unknown): Record<string, unknown> | null | undefined {
  if (value === null) return null;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    const millis = (value as { toMillis: () => number }).toMillis();
    return typeof millis === 'number' ? millis : Date.now();
  }
  return Date.now();
}

export function mapAuditLogDoc(id: string, data: Record<string, unknown>): AuditLog {
  return {
    id,
    actorEmail: optionalString(data.actorEmail) ?? 'unknown',
    actorUid: optionalString(data.actorUid),
    action: optionalString(data.action) ?? 'unknown',
    entityType:
      optionalString(data.entityType) === 'attendance_record' ||
      optionalString(data.entityType) === 'employee' ||
      optionalString(data.entityType) === 'settings' ||
      optionalString(data.entityType) === 'admin_role' ||
      optionalString(data.entityType) === 'shift' ||
      optionalString(data.entityType) === 'announcement' ||
      optionalString(data.entityType) === 'leave_request' ||
      optionalString(data.entityType) === 'system'
        ? (data.entityType as AuditLog['entityType'])
        : 'system',
    entityId: optionalString(data.entityId),
    summary: optionalString(data.summary) ?? '',
    before: optionalObject(data.before),
    after: optionalObject(data.after),
    metadata: optionalObject(data.metadata) ?? undefined,
    ipAddress: optionalString(data.ipAddress),
    createdAt: toMillis(data.createdAt),
  };
}
