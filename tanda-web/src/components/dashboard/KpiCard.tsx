import type { KpiMetric } from '@/lib/dashboard/types';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

const accentStyles = {
  blue: {
    bar: 'bg-primary',
    iconBg: 'bg-primary-muted',
    icon: 'text-primary',
    value: 'text-primary',
    sparkline: 'bg-primary',
  },
  emerald: {
    bar: 'bg-success',
    iconBg: 'bg-success/10',
    icon: 'text-success',
    value: 'text-success',
    sparkline: 'bg-success',
  },
  orange: {
    bar: 'bg-secondary',
    iconBg: 'bg-secondary-muted',
    icon: 'text-secondary',
    value: 'text-secondary',
    sparkline: 'bg-secondary',
  },
  yellow: {
    bar: 'bg-warning',
    iconBg: 'bg-warning/10',
    icon: 'text-warning',
    value: 'text-warning',
    sparkline: 'bg-warning',
  },
} as const;

interface KpiCardProps {
  metric: KpiMetric;
  loading?: boolean;
}

export function KpiCard({ metric, loading = false }: KpiCardProps) {
  const styles = accentStyles[metric.accent];
  const Icon = metric.icon;
  const sparklineMax = metric.sparkline ? Math.max(...metric.sparkline) : 0;

  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className={cn('absolute left-0 top-0 h-full w-1', styles.bar)} aria-hidden />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{metric.title}</p>
          {metric.valueLabel ? (
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-subtle">
              {metric.valueLabel}
            </p>
          ) : null}
          {loading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className={cn('mt-2 text-2xl font-semibold tracking-tight', styles.value)}>
              {metric.value}
            </p>
          )}
          {metric.description ? (
            <p className="mt-1.5 text-xs text-subtle">{metric.description}</p>
          ) : null}
        </div>

        <div className={cn('shrink-0 rounded-lg p-2.5', styles.iconBg)}>
          <Icon className={cn('h-5 w-5', styles.icon)} strokeWidth={1.75} />
        </div>
      </div>

      {metric.sparkline && metric.sparkline.length > 0 ? (
        <div className="mt-4 flex h-10 items-end gap-1 pl-2">
          {metric.sparkline.map((value, index) => (
            <div
              key={`${metric.id}-bar-${index}`}
              className={cn('flex-1 rounded-sm opacity-80', styles.sparkline)}
              style={{
                height: `${Math.max(12, (value / sparklineMax) * 100)}%`,
              }}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
