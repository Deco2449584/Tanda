import { formatAttendanceType } from '@/lib/attendance/format';
import type { AttendanceType } from '@/lib/types/attendance';

interface AttendanceTypeBadgeProps {
  type: AttendanceType | string;
  compact?: boolean;
}

export function AttendanceTypeBadge({ type, compact = false }: AttendanceTypeBadgeProps) {
  const isCheckIn = type === 'check_in';

  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-semibold ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${
        isCheckIn
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-blue-500/10 text-blue-400'
      }`}
    >
      {formatAttendanceType(type)}
    </span>
  );
}
