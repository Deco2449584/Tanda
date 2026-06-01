import { AlertCircle, Check, Clock, Trash2 } from 'lucide-react';
import { EmployeeAvatar } from '@/components/employees/EmployeeAvatar';
import { formatTimeLabel } from '@/lib/schedule/week';
import type { Shift } from '@/lib/types/shift';

interface ShiftCardProps {
  shift: Shift;
  employeeName: string;
  employeePhotoUrl?: string;
  onDelete?: (shift: Shift) => void;
}

const statusStyles = {
  scheduled: {
    container: 'border-l-4 border-blue-500 bg-blue-600/20',
    text: 'text-blue-100',
    subtext: 'text-blue-200/80',
    icon: Clock,
    iconClass: 'text-blue-400',
  },
  completed: {
    container: 'border-l-4 border-blue-500 bg-blue-600/20',
    text: 'text-blue-100',
    subtext: 'text-blue-200/80',
    icon: Check,
    iconClass: 'text-blue-400',
  },
  absent: {
    container: 'border-l-4 border-orange-500 bg-red-600/20',
    text: 'text-orange-100',
    subtext: 'text-orange-200/80',
    icon: AlertCircle,
    iconClass: 'text-orange-400',
  },
} as const;

export function ShiftCard({
  shift,
  employeeName,
  employeePhotoUrl,
  onDelete,
}: ShiftCardProps) {
  const styles = statusStyles[shift.status];
  const Icon = styles.icon;
  const timeRange = `${formatTimeLabel(shift.startTime)} - ${formatTimeLabel(shift.endTime)}`;

  return (
    <div
      className={`relative rounded-lg p-2.5 backdrop-blur-sm ${styles.container}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${styles.text}`}>{timeRange}</p>
          {shift.status === 'scheduled' && (
            <p className={`mt-1 text-[10px] ${styles.subtext}`}>
              Scheduled clock-in {formatTimeLabel(shift.startTime)}
            </p>
          )}
          {shift.status === 'completed' && (
            <p className={`mt-1 text-[10px] ${styles.subtext}`}>
              Clock-in {formatTimeLabel(shift.startTime)} — Clock-out{' '}
              {formatTimeLabel(shift.endTime)}
            </p>
          )}
          {shift.status === 'absent' && (
            <p className={`mt-1 text-[10px] font-medium ${styles.subtext}`}>
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
              className="rounded p-1 text-zinc-400 transition-colors hover:bg-black/20 hover:text-red-400"
              aria-label={`Delete shift for ${employeeName}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <Icon className={`h-3.5 w-3.5 ${styles.iconClass}`} />
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
