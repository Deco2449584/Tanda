'use client';

import { cn } from '@/lib/cn';
import { DeltaBadge } from './charts/DeltaBadge';
import type { WidgetInsight } from '@/lib/dashboard/widget-insights';

const toneClass: Record<NonNullable<WidgetInsight['tone']>, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  negative: 'text-rose-400',
  warning: 'text-warning',
};

interface WidgetInsightChipsProps {
  insights: WidgetInsight[];
  className?: string;
}

export function WidgetInsightChips({
  insights,
  className,
}: WidgetInsightChipsProps) {
  if (insights.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {insights.map((insight) => (
        <div
          key={insight.label}
          className="min-w-[8rem] flex-1 rounded-xl border border-border/70 bg-surface-base/50 px-3 py-2 sm:flex-none"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
            {insight.label}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'truncate text-sm font-semibold tabular-nums',
                toneClass[insight.tone ?? 'default'],
              )}
            >
              {insight.value}
            </span>
            {insight.delta ? (
              <DeltaBadge
                delta={insight.delta}
                sentiment={insight.deltaSentiment}
                mode={insight.deltaMode}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
