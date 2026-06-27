import type { AttendanceRecord } from '@/lib/types/attendance';

function isManualSource(source: string | undefined): boolean {
  if (!source) return false;
  return (
    source === 'web-admin-manual' ||
    source === 'web-admin-manual-checkout' ||
    source.startsWith('web-admin')
  );
}

export function isManualAttendanceRecord(record: AttendanceRecord): boolean {
  return (
    isManualSource(record.source) ||
    Boolean(record.createdByEmail) ||
    Boolean(record.lastEditedByEmail)
  );
}

export function manualAttendanceLabel(record: AttendanceRecord): string {
  if (record.lastEditedByEmail) {
    return `Edited by ${record.lastEditedByEmail}`;
  }
  if (record.createdByEmail) {
    return `Added by ${record.createdByEmail}`;
  }
  if (record.source === 'web-admin-manual-checkout') {
    return 'Manual check-out';
  }
  if (record.source === 'web-admin-manual') {
    return 'Manual entry';
  }
  return 'Manual change';
}

interface ManualAttendanceBadgeProps {
  record: AttendanceRecord;
}

export function ManualAttendanceBadge({ record }: ManualAttendanceBadgeProps) {
  if (!isManualAttendanceRecord(record)) return null;

  return (
    <span
      title={manualAttendanceLabel(record)}
      className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
    >
      Manual
    </span>
  );
}
