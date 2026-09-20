'use client';

import { computeDelta, DeltaBadge, type DeltaSentiment } from './DeltaBadge';

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}

interface RichChartTooltipProps {
  /** Injected by Recharts. */
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;

  formatValue: (value: number) => string;
  /** Total of the visible series, used for the share percentage. */
  total?: number;
  /** Rank of this category among visible entries. */
  rankOf?: (key: string) => number;
  rankTotal?: number;
  /** Same-category values from the previous period, keyed by category name. */
  previousByKey?: Map<string, number>;
  deltaSentiment?: DeltaSentiment;
  showShare?: boolean;
  /** Extra line shown under the values. */
  footnote?: string;
}

function categoryKey(
  item: TooltipPayloadItem | undefined,
  label: string | number | undefined,
): string {
  const fromPayload = item?.payload?.name;
  if (typeof fromPayload === 'string' && fromPayload) return fromPayload;
  if (typeof label === 'string' && label) return label;
  if (typeof item?.name === 'string' && item.name) return item.name;
  return '';
}

export function RichChartTooltip({
  active,
  payload,
  label,
  formatValue,
  total,
  rankOf,
  rankTotal,
  previousByKey,
  deltaSentiment = 'neutral',
  showShare = true,
  footnote,
}: RichChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const key = categoryKey(payload[0], label);
  const title = key || String(label ?? '');
  const rank = rankOf && key ? rankOf(key) : 0;
  const previous = previousByKey?.get(key);
  const primaryValue = Number(payload[0]?.value ?? 0);

  return (
    <div className="min-w-[180px] max-w-[260px] rounded-xl border border-border-strong bg-surface-raised/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="truncate text-xs font-semibold text-foreground">{title}</p>

      <div className="mt-2 space-y-2">
        {payload.map((item, index) => {
          const value = Number(item.value ?? 0);
          const color = item.color ?? item.fill ?? '#38bdf8';
          const share =
            showShare && total && total > 0
              ? Math.round((value / total) * 1000) / 10
              : null;

          return (
            <div key={`${item.dataKey ?? index}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="truncate text-xs text-muted">
                    {String(item.name ?? '')}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {formatValue(value)}
                </span>
              </div>

              {share !== null ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-base">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(2, share))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-subtle">
                    {share}%
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {rank > 0 && rankTotal && rankTotal > 1 ? (
        <p className="mt-2 text-[11px] text-subtle">
          Rank #{rank} of {rankTotal}
        </p>
      ) : null}

      {previous !== undefined ? (
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2">
          <span className="text-[11px] text-subtle">vs previous period</span>
          <DeltaBadge
            delta={computeDelta(primaryValue, previous)}
            sentiment={deltaSentiment}
            formatValue={formatValue}
          />
        </div>
      ) : null}

      {footnote ? (
        <p className="mt-2 text-[11px] text-subtle">{footnote}</p>
      ) : null}
    </div>
  );
}
