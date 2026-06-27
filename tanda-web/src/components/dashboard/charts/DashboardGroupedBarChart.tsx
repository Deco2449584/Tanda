'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GroupedBarDatum } from '@/lib/dashboard/types';
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  COLOR_HORAS_EXTRA_FALLBACK,
  COLOR_HORAS_NORMAL_FALLBACK,
} from '../chart-theme';
import { ChartShell } from './ChartShell';

interface DashboardGroupedBarChartProps {
  data: GroupedBarDatum[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DashboardGroupedBarChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
}: DashboardGroupedBarChartProps) {
  const yMax = useMemo(() => {
    const max = Math.max(
      ...data.flatMap((item) => [item.scheduled, item.actual]),
      0,
    );
    return Math.max(10, Math.ceil(max / 10) * 10);
  }, [data]);

  return (
    <ChartShell
      loading={loading}
      hasData={data.length > 0}
      emptyMessage={emptyMessage}
      heightClassName="h-[280px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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
            label={{
              value: 'Hours',
              angle: -90,
              position: 'insideLeft',
              fill: '#71717a',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={{ color: '#fafafa' }}
            itemStyle={{ color: '#e4e4e7' }}
            formatter={(value, name) => [`${value} h`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#a1a8b3' }} />
          <Bar
            dataKey="scheduled"
            name="Scheduled"
            fill={COLOR_HORAS_NORMAL_FALLBACK}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            dataKey="actual"
            name="Actual"
            fill={COLOR_HORAS_EXTRA_FALLBACK}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
