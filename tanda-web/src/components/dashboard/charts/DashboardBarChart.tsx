'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardChartColor } from '@/lib/dashboard/chart-colors';
import { COLOR_HORAS_NORMAL_FALLBACK } from '../chart-theme';
import type { NamedValueDatum } from '@/lib/dashboard/types';
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
} from '../chart-theme';
import { ChartShell } from './ChartShell';

interface DashboardBarChartProps {
  data: NamedValueDatum[];
  loading?: boolean;
  emptyMessage?: string;
  dataKey?: string;
  valueLabel?: string;
  yAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  /** When true (default), each bar gets a distinct color. Set false when passing a single `color`. */
  variedColors?: boolean;
}

export function DashboardBarChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  dataKey = 'value',
  valueLabel = 'Value',
  yAxisLabel,
  valueFormatter,
  color,
  variedColors = color === undefined,
}: DashboardBarChartProps) {
  const chartData = useMemo(
    () => data.map((item) => ({ name: item.name, [dataKey]: item.value })),
    [data, dataKey],
  );

  const yMax = useMemo(() => {
    const max = Math.max(...data.map((item) => item.value), 0);
    if (max <= 10) return Math.max(5, Math.ceil(max));
    return Math.ceil(max / 5) * 5;
  }, [data]);

  const formatValue =
    valueFormatter ?? ((value: number) => value.toLocaleString('en-AU'));

  const barColor = color ?? COLOR_HORAS_NORMAL_FALLBACK;

  return (
    <ChartShell
      loading={loading}
      hasData={data.length > 0}
      emptyMessage={emptyMessage}
      heightClassName="h-[260px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            stroke={CHART_GRID_STROKE}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={52}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            domain={[0, yMax]}
            allowDecimals={false}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#71717a',
                    fontSize: 11,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={{ color: '#fafafa' }}
            itemStyle={{ color: '#e4e4e7' }}
            formatter={(value) => [formatValue(Number(value)), valueLabel]}
          />
          <Bar
            dataKey={dataKey}
            name={valueLabel}
            fill={barColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            {variedColors
              ? chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={getDashboardChartColor(index)} />
                ))
              : null}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
