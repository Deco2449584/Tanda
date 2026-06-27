import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { mapAuditLogDoc } from '@/lib/audit/map-audit-log';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  AuditLog,
  ListAuditLogsInput,
  WriteAuditLogInput,
} from '@/lib/types/audit-log';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function auditCollection() {
  return getAdminFirestore().collection(COLLECTIONS.AUDIT_LOGS);
}

function sanitizePayload(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return { note: 'Could not serialize payload.' };
  }
}

export async function writeAuditLog(input: WriteAuditLogInput): Promise<string> {
  const docRef = await auditCollection().add({
    actorEmail: input.actorEmail.trim().toLowerCase(),
    actorUid: input.actorUid?.trim() || null,
    action: input.action.trim(),
    entityType: input.entityType,
    entityId: input.entityId?.trim() || null,
    summary: input.summary.trim(),
    before: sanitizePayload(input.before) ?? null,
    after: sanitizePayload(input.after) ?? null,
    metadata: sanitizePayload(input.metadata) ?? null,
    ipAddress: input.ipAddress?.trim() || null,
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function listAuditLogs(input: ListAuditLogsInput = {}): Promise<AuditLog[]> {
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const snapshot = await auditCollection().orderBy('createdAt', 'desc').limit(limit).get();
  const startMs = input.startDate
    ? new Date(`${input.startDate}T00:00:00`).getTime()
    : null;
  const endMs = input.endDate
    ? new Date(`${input.endDate}T23:59:59.999`).getTime()
    : null;
  const search = input.search?.trim().toLowerCase() ?? '';
  const actorEmail = input.actorEmail?.trim().toLowerCase() ?? '';
  const actionPrefix = input.actionPrefix?.trim() ?? '';

  return snapshot.docs
    .map((document) => mapAuditLogDoc(document.id, document.data() as Record<string, unknown>))
    .filter((log) => {
      if (input.entityType && log.entityType !== input.entityType) return false;
      if (actorEmail && log.actorEmail !== actorEmail) return false;
      if (actionPrefix && !log.action.startsWith(actionPrefix)) return false;
      if (startMs !== null && log.createdAt < startMs) return false;
      if (endMs !== null && log.createdAt > endMs) return false;
      if (!search) return true;

      const haystack = [
        log.summary,
        log.action,
        log.actorEmail,
        log.entityId,
        log.entityType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
}

export function getRequestIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  return realIp || undefined;
}
