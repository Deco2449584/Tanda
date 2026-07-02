import { AlertCircle, Check, HelpCircle, Trash2, UserCheck, UserX } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { ShiftConfirmationBadge } from '@/components/shifts/ShiftConfirmationActions';
import {
  getScheduledShiftCardContainerClass,
  getScheduledShiftCompactContainerClass,
  getScheduledShiftConfirmationPillClass,
  getScheduledShiftIconClass,
  resolveShiftConfirmationStatus,
} from '@/lib/schedule/schedule-legend';
import {
  getShiftConfirmationLabel,
  getShiftConfirmationShortCode,
} from '@/lib/shifts/shift-confirmation';
import { formatShiftLocationLabel } from '@/lib/schedule/format-shift-location';
import { formatShiftTimeRangeShort, formatTimeLabel } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

interface ShiftCardProps {
  shift: Shift;
  employeeName: string;
  employeePhotoUrl?: string;
  onEdit?: (shift: Shift) => void;
  onDelete?: (shift: Shift) => void;
  compact?: boolean;
}

const statusStyles = {
  completed: {
    container: 'border-l-4 border-emerald-500 bg-surface-overlay/90',
    compactContainer: 'border-l-2 border-emerald-500 bg-surface-overlay/90',
    text: 'text-foreground',
    subtext: 'text-muted',
    icon: Check,
    iconClass: 'text-emerald-400',
  },
  absent: {
    container: 'border-l-4 border-orange-500 bg-red-600/20',
    compactContainer: 'border-l-2 border-orange-500 bg-red-600/20',
    text: 'text-orange-100',
    subtext: 'text-orange-200/80',
    icon: AlertCircle,
    iconClass: 'text-orange-400',
  },
} as const;

const SCHEDULED_ICONS = {
  pending: HelpCircle,
  confirmed: UserCheck,
  declined: UserX,
} as const;

function getShiftPresentation(shift: Shift) {
  if (shift.status === 'scheduled') {
    const confirmation = resolveShiftConfirmationStatus(shift.confirmationStatus);
    return {
      container: getScheduledShiftCardContainerClass(shift.confirmationStatus),
      compactContainer: getScheduledShiftCompactContainerClass(shift.confirmationStatus),
      pillClass: getScheduledShiftConfirmationPillClass(shift.confirmationStatus),
      text: 'text-foreground',
      subtext: 'text-muted',
      icon: SCHEDULED_ICONS[confirmation],
      iconClass: getScheduledShiftIconClass(shift.confirmationStatus),
    };
  }

  const styles = statusStyles[shift.status];
  return {
    container: styles.container,
    compactContainer: styles.compactContainer,
    pillClass: '',
    text: styles.text,
    subtext: styles.subtext,
    icon: styles.icon,
    iconClass: styles.iconClass,
  };
}

export function ShiftCard({
  shift,
  employeeName,
  employeePhotoUrl,
  onEdit,
  onDelete,
  compact = false,
}: ShiftCardProps) {
  const presentation = getShiftPresentation(shift);
  const Icon = presentation.icon;
  const timeRange = `${formatTimeLabel(shift.startTime)} - ${formatTimeLabel(shift.endTime)}`;
  const locationLabel = formatShiftLocationLabel(shift);
  const confirmationLabel =
    shift.status === 'scheduled'
      ? getShiftConfirmationLabel(shift.confirmationStatus)
      : '';
  const confirmationCode =
    shift.status === 'scheduled'
      ? getShiftConfirmationShortCode(shift.confirmationStatus)
      : '';

  if (compact) {
    return (
      <div
        className={`rounded border px-1 py-0.5 ${
          shift.status === 'scheduled'
            ? presentation.pillClass
            : presentation.compactContainer
        }`}
        title={confirmationLabel || undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-0.5">
          <p className={`truncate text-[9px] font-semibold leading-tight ${presentation.text}`}>
            {formatShiftTimeRangeShort(shift.startTime, shift.endTime)}
            {shift.status === 'scheduled' ? (
              <span className="ml-0.5 opacity-90">{confirmationCode}</span>
            ) : null}
          </p>
          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(shift);
              }}
              className="shrink-0 rounded p-0.5 text-subtle hover:text-red-400"
              aria-label={`Delete shift for ${employeeName}`}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          ) : (
            <Icon className={`h-2.5 w-2.5 shrink-0 ${presentation.iconClass}`} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={(event) => {
        if (!onEdit) return;
        event.stopPropagation();
        onEdit(shift);
      }}
      onKeyDown={(event) => {
        if (!onEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          onEdit(shift);
        }
      }}
      className={`relative rounded-lg p-2.5 backdrop-blur-sm ${presentation.container} ${
        onEdit ? 'cursor-pointer transition hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-primary/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${presentation.text}`}>{timeRange}</p>
          {locationLabel ? (
            <p className={`mt-0.5 text-[10px] ${presentation.subtext}`}>{locationLabel}</p>
          ) : null}
          {shift.status === 'scheduled' && (
            <p className={`mt-1 text-[10px] ${presentation.subtext}`}>
              Scheduled clock-in {formatTimeLabel(shift.startTime)}
            </p>
          )}
          {shift.status === 'scheduled' ? (
            <div className="mt-1.5">
              <ShiftConfirmationBadge shift={shift} />
              {shift.confirmationStatus === 'declined' && shift.confirmationNote ? (
                <p className={`mt-1 text-[10px] ${presentation.subtext}`}>
                  {shift.confirmationNote}
                </p>
              ) : null}
            </div>
          ) : null}
          {shift.status === 'completed' && (
            <p className={`mt-1 text-[10px] ${presentation.subtext}`}>
              Clock-in {formatTimeLabel(shift.startTime)} — Clock-out{' '}
              {formatTimeLabel(shift.endTime)}
            </p>
          )}
          {shift.status === 'absent' && (
            <p className={`mt-1 text-[10px] font-medium ${presentation.subtext}`}>
              {shift.note || 'Absent (Medical leave)'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(shift);
              }}
              className="rounded p-1 text-muted transition-colors hover:bg-black/20 hover:text-red-400"
              aria-label={`Delete shift for ${employeeName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <Icon className={`h-3.5 w-3.5 ${presentation.iconClass}`} />
        </div>
      </div>

      {shift.status === 'completed' && (
        <div className="absolute bottom-1.5 right-1.5">
          <EmployeeAvatar
            name={employeeName}
            photoUrl={employeePhotoUrl}
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
