'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import type { NamedValueDatum, WeeklyHoursDatum } from '@/lib/dashboard/types';
import {
  CHART_ACTIVE_DOT,
  CHART_AREA_CURSOR,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  COLOR_HORAS_NORMAL_FALLBACK,
} from '../chart-theme';
import { ChartShell } from './ChartShell';

interface DashboardAreaChartProps {
  data: Array<{ day: string; value: number }>;
  loading?: boolean;
  emptyMessage?: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  gradientId?: string;
}

export function DashboardAreaChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  valueLabel = 'Value',
  valueFormatter,
  color = COLOR_HORAS_NORMAL_FALLBACK,
  gradientId = 'dashboardAreaFill',
}: DashboardAreaChartProps) {
  const yMax = useMemo(() => {
    const max = Math.max(...data.map((item) => item.value), 0);
    return Math.max(10, Math.ceil(max / 10) * 10);
  }, [data]);

  const formatValue =
    valueFormatter ?? ((value: number) => value.toLocaleString('en-AU'));

  return (
    <ChartShell loading={loading} hasData={data.length > 0} emptyMessage={emptyMessage}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={CHART_GRID_STROKE}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            domain={[0, yMax]}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={{ color: '#fafafa' }}
            itemStyle={{ color: '#e4e4e7' }}
            cursor={CHART_AREA_CURSOR}
            formatter={(value) => [formatValue(Number(value)), valueLabel]}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: color }}
            activeDot={{
              ...CHART_ACTIVE_DOT,
              fill: color,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function DashboardWeeklyHoursAreaChart({
  data,
  loading,
}: {
  data: WeeklyHoursDatum[];
  loading?: boolean;
}) {
  const chartData = data.map((item) => ({ day: item.day, value: item.horas }));

  return (
    <DashboardAreaChart
      data={chartData}
      loading={loading}
      valueLabel="Scheduled hours"
      valueFormatter={(value) => `${value} h`}
      gradientId="fillScheduledHours"
      color="#38bdf8"
    />
  );
}

export function DashboardPayrollTrendChart({
  data,
  currency,
  loading,
}: {
  data: NamedValueDatum[];
  currency: string;
  loading?: boolean;
}) {
  const chartData = data.map((item) => ({ day: item.name, value: item.value }));

  return (
    <DashboardAreaChart
      data={chartData}
      loading={loading}
      valueLabel="Payroll"
      valueFormatter={(value) => formatDashboardCurrency(value, currency)}
      color="#22c55e"
      gradientId="fillPayrollTrend"
      emptyMessage="No payroll activity in the selected period."
    />
  );
}
