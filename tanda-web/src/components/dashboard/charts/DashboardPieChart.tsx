'use client';

import { useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DASHBOARD_CHART_COLORS } from '@/lib/dashboard/chart-colors';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import type { NamedValueDatum } from '@/lib/dashboard/types';
import { CHART_TOOLTIP_STYLE } from '../chart-theme';
import { ChartShell } from './ChartShell';

interface DashboardPieChartProps {
  data: NamedValueDatum[];
  loading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
}

function PieLegend({
  data,
  formatValue,
}: {
  data: NamedValueDatum[];
  formatValue: (value: number) => string;
}) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  return (
    <ul className="space-y-2 text-xs">
      {data.map((item, index) => {
        const percent = total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0;

        return (
          <li key={item.name} className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length],
                }}
              />
              <span className="text-foreground">{item.name}</span>
            </span>
            <span className="shrink-0 text-muted">
              {formatValue(item.value)} ({percent}%)
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardPieChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  valueFormatter,
  showLegend = true,
}: DashboardPieChartProps) {
  const formatValue =
    valueFormatter ?? ((value: number) => value.toLocaleString('en-AU'));

  return (
    <ChartShell
      loading={loading}
      hasData={data.length > 0}
      emptyMessage={emptyMessage}
      fitContent
    >
      <div
        className={
          showLegend
            ? 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(200px,280px)]'
            : ''
        }
      >
        <div className="h-[240px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={
                      DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: '#fafafa' }}
                itemStyle={{ color: '#e4e4e7' }}
                formatter={(value, _name, item) => [
                  formatValue(Number(value)),
                  item?.payload?.name ?? 'Value',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {showLegend ? (
          <PieLegend data={data} formatValue={formatValue} />
        ) : null}
      </div>
    </ChartShell>
  );
}

export function DashboardCurrencyPieChart({
  data,
  currency,
  loading,
  emptyMessage,
}: DashboardPieChartProps & { currency: string }) {
  return (
    <DashboardPieChart
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      valueFormatter={(value) => formatDashboardCurrency(value, currency)}
    />
  );
}
