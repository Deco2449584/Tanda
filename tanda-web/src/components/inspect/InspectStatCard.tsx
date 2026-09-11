import type { LucideIcon } from 'lucide-react';

const TONES = {
  warehouse: {
    icon: 'bg-sky-500/15 text-sky-400',
    value: 'text-foreground',
  },
  truck: {
    icon: 'bg-emerald-500/15 text-emerald-400',
    value: 'text-foreground',
  },
  attention: {
    icon: 'bg-amber-500/15 text-amber-400',
    value: 'text-foreground',
  },
} as const;

interface InspectStatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof TONES;
}

export function InspectStatCard({
  title,
  value,
  icon: Icon,
  tone,
}: InspectStatCardProps) {
  const styles = TONES[tone];

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised px-2 py-4">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${styles.icon}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <p className={`text-2xl font-semibold tabular-nums ${styles.value}`}>
        {value}
      </p>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-subtle">
        {title}
      </p>
    </div>
  );
}
