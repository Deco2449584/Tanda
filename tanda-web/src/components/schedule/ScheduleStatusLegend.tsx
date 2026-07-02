import {
  AlertCircle,
  Check,
  HelpCircle,
  UserCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import { SCHEDULE_LEGEND_ITEMS, type ScheduleLegendKind } from '@/lib/schedule/schedule-legend';

const LEGEND_ICONS: Record<ScheduleLegendKind, LucideIcon> = {
  pending: HelpCircle,
  confirmed: UserCheck,
  declined: UserX,
  completed: Check,
  absent: AlertCircle,
};

interface ScheduleStatusLegendProps {
  className?: string;
}

export function ScheduleStatusLegend({ className = '' }: ScheduleStatusLegendProps) {
  return (
    <div
      className={`w-full max-w-full rounded-xl border border-border/80 bg-surface-base/50 px-3 py-2.5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
          Legend
        </span>
        {SCHEDULE_LEGEND_ITEMS.map(({ kind, label, chip }) => {
          const Icon = LEGEND_ICONS[kind];

          return (
            <span
              key={kind}
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${chip}`}
            >
              <Icon className="h-3 w-3 shrink-0" aria-hidden />
              {label}
            </span>
          );
        })}
        <span className="min-w-0 text-[10px] leading-snug text-subtle">
          Assigned shifts use confirmation colors; completed and absent come from attendance
        </span>
      </div>
    </div>
  );
}
