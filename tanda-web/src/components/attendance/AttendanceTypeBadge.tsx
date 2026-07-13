import { formatAttendanceType } from '@/lib/attendance/format';
import type { AttendanceType } from '@/lib/types/attendance';

interface AttendanceTypeBadgeProps {
  type: AttendanceType | string;
  compact?: boolean;
}

function badgeClass(type: string): string {
  switch (type) {
    case 'check_in':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'check_out':
      return 'bg-blue-500/10 text-blue-400';
    case 'break_start':
      return 'bg-amber-500/10 text-amber-300';
    case 'break_end':
      return 'bg-sky-500/10 text-sky-300';
    default:
      return 'bg-zinc-500/10 text-zinc-300';
  }
}

export function AttendanceTypeBadge({ type, compact = false }: AttendanceTypeBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full font-semibold ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } ${badgeClass(type)}`}
    >
      {formatAttendanceType(type)}
    </span>
  );
}
