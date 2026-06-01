import type { KpiMetric } from '@/lib/dashboard/types';

const accentStyles = {
  blue: {
    bar: 'bg-blue-600',
    iconBg: 'bg-blue-600/15',
    icon: 'text-blue-500',
    value: 'text-blue-400',
    sparkline: 'bg-blue-600',
  },
  orange: {
    bar: 'bg-orange-500',
    iconBg: 'bg-orange-500/15',
    icon: 'text-orange-500',
    value: 'text-orange-400',
    sparkline: 'bg-orange-500',
  },
  yellow: {
    bar: 'bg-yellow-500',
    iconBg: 'bg-yellow-500/15',
    icon: 'text-yellow-500',
    value: 'text-yellow-400',
    sparkline: 'bg-yellow-500',
  },
} as const;

interface KpiCardProps {
  metric: KpiMetric;
  loading?: boolean;
}

export function KpiCard({ metric, loading = false }: KpiCardProps) {
  const styles = accentStyles[metric.accent];
  const Icon = metric.icon;
  const sparklineMax = metric.sparkline
    ? Math.max(...metric.sparkline)
    : 0;

  return (
    <article className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className={`absolute left-0 top-0 h-full w-1 ${styles.bar}`} aria-hidden />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-400">{metric.title}</p>
          {metric.valueLabel && (
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {metric.valueLabel}
            </p>
          )}
          <p className={`mt-1 text-2xl font-bold tracking-tight ${styles.value}`}>
            {loading ? (
              <span className="inline-block animate-pulse text-zinc-500">...</span>
            ) : (
              metric.value
            )}
          </p>
          {metric.description && (
            <p
              className={`mt-1.5 ${
                metric.id === 'payroll-cost'
                  ? 'text-xs font-normal text-zinc-500'
                  : 'text-[11px] font-semibold uppercase tracking-wide text-zinc-500'
              }`}
            >
              {metric.description}
            </p>
          )}
        </div>

        <div className={`shrink-0 rounded-xl p-3 ${styles.iconBg}`}>
          <Icon className={`h-6 w-6 ${styles.icon}`} strokeWidth={1.75} />
        </div>
      </div>

      {metric.sparkline && metric.sparkline.length > 0 && (
        <div className="mt-4 flex h-10 items-end gap-1 pl-2">
          {metric.sparkline.map((value, index) => (
            <div
              key={`${metric.id}-bar-${index}`}
              className={`flex-1 rounded-sm ${styles.sparkline} opacity-80`}
              style={{
                height: `${Math.max(12, (value / sparklineMax) * 100)}%`,
              }}
            />
          ))}
        </div>
      )}
    </article>
  );
}
