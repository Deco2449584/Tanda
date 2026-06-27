import type { AttendanceType } from '@/lib/types/attendance';

function timestampToMillis(value: unknown): number | null {
  if (value && typeof value === 'object') {
    if ('toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis();
    }
    if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().getTime();
    }
    if ('_seconds' in value && typeof (value as { _seconds: number })._seconds === 'number') {
      return (value as { _seconds: number })._seconds * 1000;
    }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

export function formatAuditTimestamp(value: unknown): string {
  const ms = timestampToMillis(value);
  if (ms == null) return '—';

  return new Date(ms).toLocaleString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function pickAttendanceAuditSnapshot(data: Record<string, unknown>) {
  return {
    type: data.type,
    employeeId: data.employeeId,
    employeeNameSnapshot: data.employeeNameSnapshot,
    timestamp: formatAuditTimestamp(data.timestampServer),
    timestampMs: timestampToMillis(data.timestampServer),
    locationId: data.locationId ?? null,
    locationNameSnapshot: data.locationNameSnapshot ?? null,
    breakWaived: data.breakWaived ?? null,
    source: data.source ?? null,
  };
}

function formatTypeLabel(type: unknown): string {
  if (type === 'check_in') return 'check-in';
  if (type === 'check_out') return 'check-out';
  return String(type ?? 'record');
}

export function buildManualCreateAuditSummary(input: {
  employeeName: string;
  type: AttendanceType;
  timestampMs: number;
  source: string;
}): string {
  const when = formatAuditTimestamp(input.timestampMs);
  const kind = formatTypeLabel(input.type);
  const via =
    input.source === 'web-admin-manual-checkout'
      ? 'manual check-out'
      : 'manual record';

  return `Added ${via} (${kind}) for ${input.employeeName} at ${when}`;
}

export function buildAttendanceEditAuditSummary(input: {
  employeeName: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}): { summary: string; action: string; timestampChanged: boolean } {
  const beforeMs = timestampToMillis(input.before.timestampServer);
  const afterMs = timestampToMillis(input.after.timestampServer);
  const timestampChanged = beforeMs != null && afterMs != null && beforeMs !== afterMs;
  const typeChanged = input.before.type !== input.after.type;

  const name = input.employeeName || 'employee';
  const kind = formatTypeLabel(input.after.type ?? input.before.type);

  if (timestampChanged) {
    return {
      action: 'attendance.time_edited',
      timestampChanged: true,
      summary: `Changed ${kind} time for ${name}: ${formatAuditTimestamp(input.before.timestampServer)} → ${formatAuditTimestamp(input.after.timestampServer)}`,
    };
  }

  if (typeChanged) {
    return {
      action: 'attendance.updated',
      timestampChanged: false,
      summary: `Changed ${name} record type: ${formatTypeLabel(input.before.type)} → ${formatTypeLabel(input.after.type)}`,
    };
  }

  return {
    action: 'attendance.updated',
    timestampChanged: false,
    summary: `Updated ${kind} record for ${name} (${formatAuditTimestamp(input.after.timestampServer)})`,
  };
}

export function buildAttendanceDeleteAuditSummary(input: {
  employeeName: string;
  data: Record<string, unknown>;
}): string {
  const kind = formatTypeLabel(input.data.type);
  const when = formatAuditTimestamp(input.data.timestampServer);
  return `Deleted ${kind} for ${input.employeeName} (${when})`;
}
