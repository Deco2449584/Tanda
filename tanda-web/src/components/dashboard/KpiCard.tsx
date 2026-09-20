import type { KpiMetric } from '@/lib/dashboard/types';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { DeltaBadge } from './charts/DeltaBadge';

const accentStyles = {
  blue: {
    bar: 'bg-primary',
    iconBg: 'bg-primary-muted',
    icon: 'text-primary',
    value: 'text-primary',
    stroke: '#38bdf8',
  },
  emerald: {
    bar: 'bg-success',
    iconBg: 'bg-success/10',
    icon: 'text-success',
    value: 'text-success',
    stroke: '#22c55e',
  },
  orange: {
    bar: 'bg-secondary',
    iconBg: 'bg-secondary-muted',
    icon: 'text-secondary',
    value: 'text-secondary',
    stroke: '#f97316',
  },
  yellow: {
    bar: 'bg-warning',
    iconBg: 'bg-warning/10',
    icon: 'text-warning',
    value: 'text-warning',
    stroke: '#f59e0b',
  },
  violet: {
    bar: 'bg-violet-500',
    iconBg: 'bg-violet-500/15',
    icon: 'text-violet-300',
    value: 'text-violet-300',
    stroke: '#a78bfa',
  },
  rose: {
    bar: 'bg-rose-500',
    iconBg: 'bg-rose-500/15',
    icon: 'text-rose-300',
    value: 'text-rose-300',
    stroke: '#fb7185',
  },
  cyan: {
    bar: 'bg-cyan-500',
    iconBg: 'bg-cyan-500/15',
    icon: 'text-cyan-300',
    value: 'text-cyan-300',
    stroke: '#06b6d4',
  },
} as const;

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 34;

/** Smooth mini trend rendered as SVG so it stays crisp at any card width. */
function Sparkline({ values, color, id }: { values: number[]; color: string; id: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = SPARK_WIDTH / (values.length - 1);

  const points = values.map((value, index) => ({
    x: index * stepX,
    y: SPARK_HEIGHT - ((value - min) / span) * (SPARK_HEIGHT - 4) - 2,
  }));

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${SPARK_WIDTH},${SPARK_HEIGHT} L0,${SPARK_HEIGHT} Z`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      className="h-9 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}

interface KpiCardProps {
  metric: KpiMetric;
  loading?: boolean;
}

export function KpiCard({ metric, loading = false }: KpiCardProps) {
  const styles = accentStyles[metric.accent];
  const Icon = metric.icon;

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
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <p className={cn('text-2xl font-semibold tracking-tight', styles.value)}>
                {metric.value}
              </p>
              {metric.delta ? (
                <DeltaBadge
                  delta={metric.delta}
                  sentiment={metric.deltaSentiment}
                  mode={metric.delta.percent === null ? 'absolute' : 'percent'}
                />
              ) : null}
            </div>
          )}
          {metric.description ? (
            <p className="mt-1.5 text-xs text-subtle">{metric.description}</p>
          ) : null}
        </div>

        <div className={cn('shrink-0 rounded-lg p-2.5', styles.iconBg)}>
          <Icon className={cn('h-5 w-5', styles.icon)} strokeWidth={1.75} />
        </div>
      </div>

      {metric.sparkline && metric.sparkline.length > 1 ? (
        <div className="mt-3 pl-2">
          <Sparkline
            values={metric.sparkline}
            color={styles.stroke}
            id={`spark-${metric.id}`}
          />
          {metric.sparklineLabel ? (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-subtle">
              {metric.sparklineLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
