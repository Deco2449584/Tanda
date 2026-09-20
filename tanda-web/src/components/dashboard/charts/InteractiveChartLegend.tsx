'use client';

import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ChartSeriesState } from './useChartSeries';

interface InteractiveChartLegendProps {
  series: ChartSeriesState;
  formatValue: (value: number) => string;
  /** Vertical list (donut sidebar) or wrapping row (bars/area). */
  layout?: 'stack' | 'inline';
  className?: string;
}

export function InteractiveChartLegend({
  series,
  formatValue,
  layout = 'stack',
  className,
}: InteractiveChartLegendProps) {
  const { entries, hidden, hasHidden, visibleTotal, toggle, isolate, reset } =
    series;

  if (entries.length === 0) return null;

  return (
    <div
      className={cn(
        layout === 'stack' ? 'space-y-1.5' : 'flex flex-wrap gap-1.5',
        className,
      )}
    >
      {entries.map((entry) => {
        const isHidden = hidden.has(entry.key);
        const percent =
          !isHidden && visibleTotal > 0
            ? Math.round((entry.value / visibleTotal) * 1000) / 10
            : null;

        return (
          <div
            key={entry.key}
            className={cn(
              'group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
              layout === 'stack' ? 'w-full' : '',
              isHidden
                ? 'border-border/60 bg-surface-base/30'
                : 'border-border bg-surface-base/60',
            )}
          >
            <button
              type="button"
              onClick={() => toggle(entry.key)}
              aria-pressed={!isHidden}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              title={isHidden ? `Show ${entry.label}` : `Hide ${entry.label}`}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                  isHidden ? 'border-border-strong' : 'border-transparent',
                )}
                style={
                  isHidden ? undefined : { backgroundColor: entry.color }
                }
                aria-hidden
              >
                {isHidden ? null : (
                  <svg
                    viewBox="0 0 12 12"
                    className="h-2.5 w-2.5 text-black/70"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 6.5 5 9l4.5-5.5" />
                  </svg>
                )}
              </span>

              <span
                className={cn(
                  'min-w-0 flex-1 break-words text-xs',
                  isHidden ? 'text-subtle line-through' : 'text-foreground',
                )}
              >
                {entry.label}
              </span>

              <span
                className={cn(
                  'shrink-0 text-xs tabular-nums',
                  isHidden ? 'text-subtle' : 'text-muted',
                )}
              >
                {formatValue(entry.value)}
                {percent !== null ? ` (${percent}%)` : ''}
              </span>
            </button>

            {entries.length > 1 ? (
              <button
                type="button"
                onClick={() => isolate(entry.key)}
                className="shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-subtle opacity-100 transition hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                title={`Show only ${entry.label}`}
              >
                Only
              </button>
            ) : null}
          </div>
        );
      })}

      {hasHidden ? (
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Show all
        </button>
      ) : null}
    </div>
  );
}
