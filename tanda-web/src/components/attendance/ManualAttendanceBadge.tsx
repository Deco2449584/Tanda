import {
  getAttendanceProvenance,
  hasAttendanceProvenance,
} from '@/lib/attendance/attendance-provenance';
import type { AttendanceRecord } from '@/lib/types/attendance';

interface AttendanceProvenanceBadgeProps {
  record: AttendanceRecord;
  compact?: boolean;
}

export function AttendanceProvenanceBadge({
  record,
  compact = false,
}: AttendanceProvenanceBadgeProps) {
  const provenance = getAttendanceProvenance(record);
  if (provenance.kind === 'none') return null;

  const tone =
    provenance.kind === 'edited'
      ? 'bg-amber-500/15 text-amber-300'
      : provenance.kind === 'scan'
        ? 'bg-violet-500/15 text-violet-300'
        : 'bg-sky-500/15 text-sky-300';

  return (
    <span
      title={provenance.tooltip}
      className={`inline-flex rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
        compact ? 'text-[9px]' : 'text-[10px]'
      } ${tone}`}
    >
      {provenance.badgeLabel}
    </span>
  );
}

interface AttendanceProvenanceNoteProps {
  record: AttendanceRecord;
  compact?: boolean;
  employeeView?: boolean;
}

export function AttendanceProvenanceNote({
  record,
  compact = false,
  employeeView = false,
}: AttendanceProvenanceNoteProps) {
  const provenance = getAttendanceProvenance(record);
  if (provenance.kind === 'none') return null;

  const text = employeeView
    ? provenance.kind === 'edited'
      ? `Adjusted by an administrator${provenance.lastEditedAtLabel ? ` · ${provenance.lastEditedAtLabel}` : ''}`
      : provenance.kind === 'scan'
        ? `${provenance.badgeLabel} clock-in${provenance.createdAtLabel ? ` · ${provenance.createdAtLabel}` : ''}`
        : `Added manually by an administrator${provenance.createdAtLabel ? ` · ${provenance.createdAtLabel}` : ''}`
    : provenance.shortLabel;

  const color =
    provenance.kind === 'scan' ? 'text-violet-300/90' : 'text-amber-300/90';

  return (
    <p
      title={provenance.tooltip}
      className={`leading-snug ${color} ${
        compact ? 'mt-1 text-[10px]' : 'text-xs'
      }`}
    >
      {text}
    </p>
  );
}

export function AttendanceProvenancePanel({ record }: { record: AttendanceRecord }) {
  if (!hasAttendanceProvenance(record)) return null;

  const provenance = getAttendanceProvenance(record);
  const isEdited = provenance.kind === 'edited';
  const isScan = provenance.kind === 'scan';

  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-3 ${
        isEdited
          ? 'border-amber-500/30 bg-amber-950/20'
          : isScan
            ? 'border-violet-500/30 bg-violet-950/20'
            : 'border-sky-500/30 bg-sky-950/20'
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isEdited
            ? 'text-amber-300'
            : isScan
              ? 'text-violet-300'
              : 'text-sky-300'
        }`}
      >
        {isEdited
          ? 'Administrator edit'
          : isScan
            ? provenance.scanChannel === 'nfc'
              ? 'NFC check-in'
              : provenance.scanChannel === 'qr'
                ? 'QR check-in'
                : 'QR / NFC check-in'
            : 'Manual entry'}
      </p>
      <p className="mt-1 text-sm text-foreground">{provenance.shortLabel}</p>
      {provenance.wasManuallyAdded && provenance.wasEdited ? (
        <dl className="mt-3 grid gap-2 text-xs text-subtle sm:grid-cols-2">
          {provenance.createdByEmail ? (
            <div>
              <dt className="font-medium text-muted">Originally added by</dt>
              <dd className="text-foreground">{provenance.createdByEmail}</dd>
            </div>
          ) : null}
          {provenance.createdAtLabel ? (
            <div>
              <dt className="font-medium text-muted">Added at</dt>
              <dd className="text-foreground">{provenance.createdAtLabel}</dd>
            </div>
          ) : null}
          {provenance.lastEditedByEmail ? (
            <div>
              <dt className="font-medium text-muted">Last edited by</dt>
              <dd className="text-foreground">{provenance.lastEditedByEmail}</dd>
            </div>
          ) : null}
          {provenance.lastEditedAtLabel ? (
            <div>
              <dt className="font-medium text-muted">Last edited at</dt>
              <dd className="text-foreground">{provenance.lastEditedAtLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

// Backwards-compatible exports
export {
  getAttendanceProvenance,
  hasAttendanceProvenance,
  isManualAttendanceRecord,
  manualAttendanceLabel,
} from '@/lib/attendance/attendance-provenance';

/** @deprecated Use AttendanceProvenanceBadge */
export function ManualAttendanceBadge({
  record,
}: {
  record: AttendanceRecord;
}) {
  return <AttendanceProvenanceBadge record={record} />;
}
