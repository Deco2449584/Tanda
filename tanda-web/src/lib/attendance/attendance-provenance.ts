import {
  formatRecordDate,
  formatRecordTime,
} from '@/lib/attendance/format';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Timestamp } from 'firebase/firestore';

export type AttendanceProvenanceKind = 'none' | 'added' | 'edited' | 'scan';

export type AttendanceScanChannel = 'qr' | 'nfc' | 'scan';

export interface AttendanceProvenance {
  kind: AttendanceProvenanceKind;
  wasManuallyAdded: boolean;
  wasEdited: boolean;
  wasScan: boolean;
  scanChannel?: AttendanceScanChannel;
  createdByEmail?: string;
  createdAtLabel?: string;
  lastEditedByEmail?: string;
  lastEditedAtLabel?: string;
  badgeLabel: string;
  shortLabel: string;
  tooltip: string;
}

export function isAdminManualSource(source: string | undefined): boolean {
  if (!source) return false;
  return (
    source === 'web-admin-manual' ||
    source === 'web-admin-manual-checkout'
  );
}

export function resolveAttendanceScanChannel(
  source: string | undefined,
): AttendanceScanChannel | null {
  if (!source) return null;
  if (source === 'web-scan-qr') return 'qr';
  if (source === 'web-scan-nfc') return 'nfc';
  if (source === 'web-scan') return 'scan';
  return null;
}

export function isScanAttendanceSource(source: string | undefined): boolean {
  return resolveAttendanceScanChannel(source) !== null;
}

function formatProvenanceTimestamp(
  value: Timestamp | null | undefined,
): string | undefined {
  if (!value) return undefined;
  return `${formatRecordDate(value)} ${formatRecordTime(value)}`;
}

function scanLabels(channel: AttendanceScanChannel): {
  badge: string;
  kind: string;
} {
  if (channel === 'qr') return { badge: 'QR', kind: 'QR scan' };
  if (channel === 'nfc') return { badge: 'NFC', kind: 'NFC tap' };
  return { badge: 'Scan', kind: 'QR / NFC scan' };
}

export function getAttendanceProvenance(
  record: AttendanceRecord,
): AttendanceProvenance {
  const scanChannel = resolveAttendanceScanChannel(record.source);
  const wasScan = scanChannel !== null;
  const wasManuallyAdded = isAdminManualSource(record.source);
  const wasEdited = Boolean(record.lastEditedByEmail);
  const createdByEmail = record.createdByEmail;
  const lastEditedByEmail = record.lastEditedByEmail;
  const createdAtLabel = formatProvenanceTimestamp(record.createdAt);
  const lastEditedAtLabel = formatProvenanceTimestamp(record.lastEditedAt);

  if (!wasManuallyAdded && !wasEdited && !wasScan) {
    return {
      kind: 'none',
      wasManuallyAdded: false,
      wasEdited: false,
      wasScan: false,
      badgeLabel: '',
      shortLabel: '',
      tooltip: '',
    };
  }

  if (wasEdited) {
    const editor = lastEditedByEmail ?? 'an administrator';
    const editedWhen = lastEditedAtLabel ? ` on ${lastEditedAtLabel}` : '';
    let origin = '';
    if (wasManuallyAdded && createdByEmail) {
      origin = ` Originally added by ${createdByEmail}${createdAtLabel ? ` on ${createdAtLabel}` : ''}.`;
    } else if (wasScan && scanChannel) {
      origin = ` Originally recorded via ${scanLabels(scanChannel).kind}.`;
    }

    return {
      kind: 'edited',
      wasManuallyAdded,
      wasEdited: true,
      wasScan,
      scanChannel: scanChannel ?? undefined,
      createdByEmail,
      createdAtLabel,
      lastEditedByEmail,
      lastEditedAtLabel,
      badgeLabel: 'Edited',
      shortLabel: `Edited by ${editor}${editedWhen}`,
      tooltip: `Edited by ${editor}${editedWhen}.${origin}`,
    };
  }

  if (wasScan && scanChannel) {
    const labels = scanLabels(scanChannel);
    const when = createdAtLabel ? ` on ${createdAtLabel}` : '';
    const who = createdByEmail ? ` · ${createdByEmail}` : '';
    return {
      kind: 'scan',
      wasManuallyAdded: false,
      wasEdited: false,
      wasScan: true,
      scanChannel,
      createdByEmail,
      createdAtLabel,
      badgeLabel: labels.badge,
      shortLabel: `${labels.kind}${who}${when}`,
      tooltip: `${labels.kind} check-in${who}${when}.`,
    };
  }

  const creator = createdByEmail ?? 'an administrator';
  const addedWhen = createdAtLabel ? ` on ${createdAtLabel}` : '';
  const manualKind =
    record.source === 'web-admin-manual-checkout'
      ? 'Manual check-out'
      : 'Manual entry';

  return {
    kind: 'added',
    wasManuallyAdded: true,
    wasEdited: false,
    wasScan: false,
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
  return getAttendanceProvenance(record).wasManuallyAdded;
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
    manualFlag:
      provenance.wasManuallyAdded || provenance.wasEdited ? 'Yes' : 'No',
    addedBy: provenance.createdByEmail ?? '',
    addedAt: provenance.createdAtLabel ?? '',
    editedBy: provenance.lastEditedByEmail ?? '',
    editedAt: provenance.lastEditedAtLabel ?? '',
  };
}
