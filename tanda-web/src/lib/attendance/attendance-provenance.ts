import { formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Timestamp } from 'firebase/firestore';

export type AttendanceProvenanceKind = 'none' | 'added' | 'edited';

export interface AttendanceProvenance {
  kind: AttendanceProvenanceKind;
  wasManuallyAdded: boolean;
  wasEdited: boolean;
  createdByEmail?: string;
  createdAtLabel?: string;
  lastEditedByEmail?: string;
  lastEditedAtLabel?: string;
  badgeLabel: string;
  shortLabel: string;
  tooltip: string;
}

function isManualSource(source: string | undefined): boolean {
  if (!source) return false;
  return (
    source === 'web-admin-manual' ||
    source === 'web-admin-manual-checkout' ||
    source.startsWith('web-admin')
  );
}

function formatProvenanceTimestamp(value: Timestamp | null | undefined): string | undefined {
  if (!value) return undefined;
  return `${formatRecordDate(value)} ${formatRecordTime(value)}`;
}

export function getAttendanceProvenance(record: AttendanceRecord): AttendanceProvenance {
  const wasManuallyAdded =
    isManualSource(record.source) || Boolean(record.createdByEmail);
  const wasEdited = Boolean(record.lastEditedByEmail);
  const createdByEmail = record.createdByEmail;
  const lastEditedByEmail = record.lastEditedByEmail;
  const createdAtLabel = formatProvenanceTimestamp(record.createdAt);
  const lastEditedAtLabel = formatProvenanceTimestamp(record.lastEditedAt);

  if (!wasManuallyAdded && !wasEdited) {
    return {
      kind: 'none',
      wasManuallyAdded: false,
      wasEdited: false,
      badgeLabel: '',
      shortLabel: '',
      tooltip: '',
    };
  }

  if (wasEdited) {
    const editor = lastEditedByEmail ?? 'an administrator';
    const editedWhen = lastEditedAtLabel ? ` on ${lastEditedAtLabel}` : '';
    const origin =
      wasManuallyAdded && createdByEmail
        ? ` Originally added by ${createdByEmail}${createdAtLabel ? ` on ${createdAtLabel}` : ''}.`
        : '';

    return {
      kind: 'edited',
      wasManuallyAdded,
      wasEdited: true,
      createdByEmail,
      createdAtLabel,
      lastEditedByEmail,
      lastEditedAtLabel,
      badgeLabel: 'Edited',
      shortLabel: `Edited by ${editor}${editedWhen}`,
      tooltip: `Edited by ${editor}${editedWhen}.${origin}`,
    };
  }

  const creator = createdByEmail ?? 'an administrator';
  const addedWhen = createdAtLabel ? ` on ${createdAtLabel}` : '';
  const manualKind =
    record.source === 'web-admin-manual-checkout' ? 'Manual check-out' : 'Manual entry';

  return {
    kind: 'added',
    wasManuallyAdded: true,
    wasEdited: false,
    createdByEmail,
    createdAtLabel,
    badgeLabel: 'Added',
    shortLabel: `${manualKind} by ${creator}${addedWhen}`,
    tooltip: `${manualKind} by ${creator}${addedWhen}.`,
  };
}

export function hasAttendanceProvenance(record: AttendanceRecord): boolean {
  return getAttendanceProvenance(record).kind !== 'none';
}

/** @deprecated Use hasAttendanceProvenance */
export function isManualAttendanceRecord(record: AttendanceRecord): boolean {
  return hasAttendanceProvenance(record);
}

/** @deprecated Use getAttendanceProvenance(record).shortLabel */
export function manualAttendanceLabel(record: AttendanceRecord): string {
  const provenance = getAttendanceProvenance(record);
  return provenance.shortLabel || 'Manual change';
}

export function formatAttendanceProvenanceForExport(record: AttendanceRecord): {
  manualFlag: string;
  addedBy: string;
  addedAt: string;
  editedBy: string;
  editedAt: string;
} {
  const provenance = getAttendanceProvenance(record);

  return {
    manualFlag: provenance.kind === 'none' ? 'No' : 'Yes',
    addedBy: provenance.createdByEmail ?? '',
    addedAt: provenance.createdAtLabel ?? '',
    editedBy: provenance.lastEditedByEmail ?? '',
    editedAt: provenance.lastEditedAtLabel ?? '',
  };
}
