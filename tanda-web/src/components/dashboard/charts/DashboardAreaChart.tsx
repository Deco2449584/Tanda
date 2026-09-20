'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
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
  CHART_AXIS_TICK_SUBTLE,
  CHART_GRID_STROKE,
  CHART_REFERENCE_LINE,
  COLOR_HORAS_NORMAL_FALLBACK,
  COLOR_NEUTRAL,
} from '../chart-theme';
import { ChartShell } from './ChartShell';
import { areaGradientFill, chartDefs } from './chart-decor';
import { RichChartTooltip } from './RichChartTooltip';
import { SafeResponsiveContainer } from './SafeResponsiveContainer';

interface TrendPoint {
  day: string;
  value: number;
}

interface DashboardAreaChartProps {
  data: TrendPoint[];
  loading?: boolean;
  emptyMessage?: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  /** Same-length series from the previous period, drawn as a ghost line. */
  previousData?: TrendPoint[];
  previousLabel?: string;
  showAverage?: boolean;
  highlightPeak?: boolean;
}

export function DashboardAreaChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  valueLabel = 'Value',
  valueFormatter,
  color = COLOR_HORAS_NORMAL_FALLBACK,
  previousData,
  previousLabel = 'Previous period',
  showAverage = true,
  highlightPeak = true,
}: DashboardAreaChartProps) {
  const formatValue = useMemo(
    () => valueFormatter ?? ((value: number) => value.toLocaleString('en-AU')),
    [valueFormatter],
  );

  /** Previous-period points align by position, not by calendar date. */
  const chartData = useMemo(
    () =>
      data.map((item, index) => ({
        day: item.day,
        value: item.value,
        ...(previousData && previousData.length > 0
          ? { previous: previousData[index]?.value ?? 0 }
          : {}),
      })),
    [data, previousData],
  );

  const previousByKey = useMemo(() => {
    if (!previousData || previousData.length === 0) return undefined;
    return new Map(
      data.map((item, index) => [item.day, previousData[index]?.value ?? 0]),
    );
  }, [data, previousData]);

  const yMax = useMemo(() => {
    const max = Math.max(
      ...data.map((item) => item.value),
      ...(previousData ?? []).map((item) => item.value),
      0,
    );
    return Math.max(10, Math.ceil((max * 1.12) / 10) * 10);
  }, [data, previousData]);

  const average = useMemo(() => {
    if (data.length === 0) return 0;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.round((total / data.length) * 100) / 100;
  }, [data]);

  const peak = useMemo(() => {
    if (data.length < 2) return null;
    return data.reduce((best, item) => (item.value > best.value ? item : best));
  }, [data]);

  return (
    <ChartShell loading={loading} hasData={data.length > 0} emptyMessage={emptyMessage}>
      <SafeResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 22, right: 16, left: -4, bottom: 0 }}>
          {chartDefs([color, COLOR_NEUTRAL])}
          <CartesianGrid
            stroke={CHART_GRID_STROKE}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK_SUBTLE}
            dy={8}
            minTickGap={12}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={CHART_AXIS_TICK}
            domain={[0, yMax]}
            tickFormatter={(value: number) => formatValue(Number(value))}
            width={72}
          />
          <Tooltip
            cursor={CHART_AREA_CURSOR}
            content={
              <RichChartTooltip
                formatValue={formatValue}
                showShare={false}
                previousByKey={previousByKey}
              />
            }
          />

          {showAverage && average > 0 ? (
            <ReferenceLine
              y={average}
              {...CHART_REFERENCE_LINE}
              label={{
                value: `Avg ${formatValue(average)}`,
                position: 'insideTopRight',
                fill: '#a1a1aa',
                fontSize: 10,
              }}
            />
          ) : null}

          {previousData && previousData.length > 0 ? (
            <Line
              type="monotone"
              dataKey="previous"
              name={previousLabel}
              stroke={COLOR_NEUTRAL}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              animationDuration={650}
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="value"
            name={valueLabel}
            stroke={color}
            strokeWidth={2.5}
            fill={areaGradientFill(color)}
            dot={data.length <= 20 ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
            activeDot={{ ...CHART_ACTIVE_DOT, fill: color }}
            animationDuration={650}
            animationEasing="ease-out"
          />

          {highlightPeak && peak ? (
            <ReferenceDot
              x={peak.day}
              y={peak.value}
              r={5}
              fill={color}
              stroke="#fafafa"
              strokeOpacity={0.7}
              strokeWidth={2}
              label={{
                value: `Peak ${formatValue(peak.value)}`,
                position: 'top',
                fill: '#e4e4e7',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          ) : null}
        </AreaChart>
      </SafeResponsiveContainer>
    </ChartShell>
  );
}

export function DashboardWeeklyHoursAreaChart({
  data,
  loading,
  previousData,
}: {
  data: WeeklyHoursDatum[];
  loading?: boolean;
  previousData?: WeeklyHoursDatum[];
}) {
  const chartData = data.map((item) => ({ day: item.day, value: item.horas }));
  const previousPoints = previousData?.map((item) => ({
    day: item.day,
    value: item.horas,
  }));

  return (
    <DashboardAreaChart
      data={chartData}
      loading={loading}
      valueLabel="Scheduled hours"
      valueFormatter={(value) => `${value} h`}
      color="#38bdf8"
      previousData={previousPoints}
    />
  );
}

export function DashboardPayrollTrendChart({
  data,
  currency,
  loading,
  previousData,
}: {
  data: NamedValueDatum[];
  currency: string;
  loading?: boolean;
  previousData?: NamedValueDatum[];
}) {
  const chartData = data.map((item) => ({ day: item.name, value: item.value }));
  const previousPoints = previousData?.map((item) => ({
    day: item.name,
    value: item.value,
  }));

  return (
    <DashboardAreaChart
      data={chartData}
      loading={loading}
      valueLabel="Payroll"
      valueFormatter={(value) => formatDashboardCurrency(value, currency)}
      color="#22c55e"
      previousData={previousPoints}
      emptyMessage="No payroll activity in the selected period."
    />
  );
}
