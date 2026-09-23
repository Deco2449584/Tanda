import {
  ISSUES_BADGE_CLASS,
  ISSUES_BADGE_STYLE,
  getInspectionListStatus,
  statusBadgeStyle,
} from '@/lib/inspections/status';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

export function InspectionLifecycleBadge({
  inspection,
  className = '',
}: {
  inspection: Pick<CargoInspection, 'status'>;
  className?: string;
}) {
  const status = getInspectionListStatus(inspection);
  return (
    <span
      className={`${status.className} ${className}`}
      style={statusBadgeStyle(status.color)}
    >
      {status.label}
    </span>
  );
}

export function InspectionIssuesBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`${ISSUES_BADGE_CLASS} ${className}`} style={ISSUES_BADGE_STYLE}>
      Issues
    </span>
  );
}
