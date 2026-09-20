'use client';

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { computeDelta, type DeltaInfo, type DeltaSentiment } from '@/lib/dashboard/delta';

export { computeDelta };
export type { DeltaInfo, DeltaSentiment };

function toneFor(
  direction: DeltaInfo['direction'],
  sentiment: DeltaSentiment,
): string {
  if (direction === 'flat' || sentiment === 'neutral') return 'text-muted';
  const isGood =
    sentiment === 'higher-is-better' ? direction === 'up' : direction === 'down';
  return isGood ? 'text-success' : 'text-rose-400';
}

interface DeltaBadgeProps {
  delta: DeltaInfo;
  sentiment?: DeltaSentiment;
  formatValue?: (value: number) => string;
  /** Show the absolute change instead of the percentage. */
  mode?: 'percent' | 'absolute';
  className?: string;
}

export function DeltaBadge({
  delta,
  sentiment = 'neutral',
  formatValue,
  mode = 'percent',
  className,
}: DeltaBadgeProps) {
  const Icon =
    delta.direction === 'up'
      ? ArrowUpRight
      : delta.direction === 'down'
        ? ArrowDownRight
        : ArrowRight;

  const format = formatValue ?? ((value: number) => value.toLocaleString('en-AU'));

  const text =
    mode === 'absolute' || delta.percent === null
      ? `${delta.absolute > 0 ? '+' : ''}${format(delta.absolute)}`
      : `${delta.percent > 0 ? '+' : ''}${delta.percent}%`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular-nums',
        toneFor(delta.direction, sentiment),
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {delta.direction === 'flat' ? 'No change' : text}
    </span>
  );
}
