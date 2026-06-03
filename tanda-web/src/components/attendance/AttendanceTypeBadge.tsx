import { formatAttendanceType } from '@/lib/attendance/format';
import type { AttendanceType } from '@/lib/types/attendance';

interface AttendanceTypeBadgeProps {
  type: AttendanceType | string;
}

export function AttendanceTypeBadge({ type }: AttendanceTypeBadgeProps) {
  const isCheckIn = type === 'check_in';

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isCheckIn
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-primary/10 text-primary'
      }`}
    >
      {formatAttendanceType(type)}
    </span>
  );
}
