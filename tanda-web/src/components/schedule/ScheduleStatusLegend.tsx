import { AlertCircle, Check, Clock } from 'lucide-react';
import type { ShiftStatus } from '@/lib/types/shift';

const LEGEND_ITEMS: {
  status: ShiftStatus;
  label: string;
  chip: string;
  Icon: typeof Clock;
}[] = [
  {
    status: 'scheduled',
    label: 'Scheduled',
    chip: 'border-primary/30 bg-primary/10 text-primary',
    Icon: Clock,
  },
  {
    status: 'completed',
    label: 'Completed',
    chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
    Icon: Check,
  },
  {
    status: 'absent',
    label: 'Absent',
    chip: 'border-orange-500/35 bg-orange-500/10 text-orange-400',
    Icon: AlertCircle,
  },
];

interface ScheduleStatusLegendProps {
  className?: string;
}

export function ScheduleStatusLegend({ className = '' }: ScheduleStatusLegendProps) {
  return (
    <div
      className={`w-full max-w-full rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Legend
        </span>
        {LEGEND_ITEMS.map(({ status, label, chip, Icon }) => (
          <span
            key={status}
            className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${chip}`}
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            {label}
          </span>
        ))}
        <span className="min-w-0 text-[10px] leading-snug text-zinc-600">
          Based on assigned shifts and attendance records
        </span>
      </div>
    </div>
  );
}
