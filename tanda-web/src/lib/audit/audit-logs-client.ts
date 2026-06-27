import { auth } from '@/lib/firebase';
import type { AuditEntityType, ListAuditLogsInput } from '@/lib/types/audit-log';
import type { AuditLog } from '@/lib/types/audit-log';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchAuditLogs(
  input: ListAuditLogsInput = {},
): Promise<AuditLog[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();

  if (input.startDate) params.set('startDate', input.startDate);
  if (input.endDate) params.set('endDate', input.endDate);
  if (input.actionPrefix) params.set('actionPrefix', input.actionPrefix);
  if (input.entityType) params.set('entityType', input.entityType as AuditEntityType);
  if (input.actorEmail) params.set('actorEmail', input.actorEmail);
  if (input.search) params.set('search', input.search);
  if (input.limit) params.set('limit', String(input.limit));

  const response = await fetch(`/api/audit-logs?${params.toString()}`, { headers });
  if (!response.ok) {
    throw new Error('Could not load audit logs.');
  }

  const data = (await response.json()) as { logs: AuditLog[] };
  return data.logs;
}

export async function downloadAuditLogsCsv(
  input: ListAuditLogsInput = {},
): Promise<void> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ format: 'csv' });

  if (input.startDate) params.set('startDate', input.startDate);
  if (input.endDate) params.set('endDate', input.endDate);
  if (input.actionPrefix) params.set('actionPrefix', input.actionPrefix);
  if (input.entityType) params.set('entityType', input.entityType as AuditEntityType);
  if (input.actorEmail) params.set('actorEmail', input.actorEmail);
  if (input.search) params.set('search', input.search);
  if (input.limit) params.set('limit', String(input.limit));

  const response = await fetch(`/api/audit-logs?${params.toString()}`, { headers });
  if (!response.ok) {
    throw new Error('Could not export audit logs.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function recordEmployeeAuditEvent(input: {
  action: 'employee.created' | 'employee.updated' | 'employee.deleted';
  employeeDocId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordClientAuditEvent({
    action: input.action,
    entityId: input.employeeDocId,
    summary: input.summary,
    metadata: input.metadata,
  });
}

export async function recordShiftAuditEvent(input: {
  action: 'shift.created' | 'shift.deleted';
  shiftId: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordClientAuditEvent({
    action: input.action,
    entityId: input.shiftId,
    summary: input.summary,
    before: input.before,
    after: input.after,
    metadata: input.metadata,
  });
}

async function recordClientAuditEvent(input: {
  action: string;
  entityId: string;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const user = auth?.currentUser;
  if (!user) return;

  const token = await user.getIdToken();
  await fetch('/api/audit/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
}
