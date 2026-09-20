'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { GroupedBarDatum } from '@/lib/dashboard/types';
import {
  CHART_AXIS_TICK,
  CHART_AXIS_TICK_SUBTLE,
  CHART_BAR_CURSOR,
  CHART_GRID_STROKE,
  CHART_VALUE_LABEL,
  COLOR_ACTUAL_FALLBACK,
  COLOR_ALERT,
  COLOR_SCHEDULED_FALLBACK,
} from '../chart-theme';
import { ChartShell } from './ChartShell';
import { chartDefs, DepthBar } from './chart-decor';
import { InteractiveChartLegend } from './InteractiveChartLegend';
import { RichChartTooltip } from './RichChartTooltip';
import { SafeResponsiveContainer } from './SafeResponsiveContainer';
import { useChartSeries, type ChartSeriesEntry } from './useChartSeries';

const SCHEDULED_KEY = 'scheduled';
const ACTUAL_KEY = 'actual';
const UNDER_COLOR = '#38bdf8';

interface DashboardGroupedBarChartProps {
  data: GroupedBarDatum[];
  loading?: boolean;
  emptyMessage?: string;
  /** `variance` collapses both series into actual − scheduled. */
  view?: 'grouped' | 'variance';
  sort?: 'value' | 'name' | 'none';
  topN?: number | 'all';
}

const formatHours = (value: number) => `${Math.round(value * 10) / 10} h`;

export function DashboardGroupedBarChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  view = 'grouped',
  sort = 'value',
  topN = 'all',
}: DashboardGroupedBarChartProps) {
  const prepared = useMemo(() => {
    const sorted = [...data];
    if (sort === 'value') sorted.sort((a, b) => b.actual - a.actual);
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    const sliced = topN === 'all' ? sorted : sorted.slice(0, topN);
    return sliced.map((item) => ({
      ...item,
      variance: Math.round((item.actual - item.scheduled) * 10) / 10,
      __color: item.actual - item.scheduled >= 0 ? COLOR_ALERT : UNDER_COLOR,
    }));
  }, [data, sort, topN]);

  const entries: ChartSeriesEntry[] = useMemo(
    () => [
      {
        key: SCHEDULED_KEY,
        label: 'Scheduled',
        color: COLOR_SCHEDULED_FALLBACK,
        value: prepared.reduce((sum, item) => sum + item.scheduled, 0),
      },
      {
        key: ACTUAL_KEY,
        label: 'Actual',
        color: COLOR_ACTUAL_FALLBACK,
        value: prepared.reduce((sum, item) => sum + item.actual, 0),
      },
    ],
    [prepared],
  );

  const series = useChartSeries(entries);
  const isVariance = view === 'variance';

  const yDomain = useMemo(() => {
    if (isVariance) {
      const max = Math.max(...prepared.map((item) => Math.abs(item.variance)), 1);
      const bound = Math.ceil(max / 5) * 5;
      return [-bound, bound] as [number, number];
    }
    const values = prepared.flatMap((item) => [
      series.isHidden(SCHEDULED_KEY) ? 0 : item.scheduled,
      series.isHidden(ACTUAL_KEY) ? 0 : item.actual,
    ]);
    const max = Math.max(...values, 0);
    return [0, Math.max(10, Math.ceil(max / 10) * 10)] as [number, number];
  }, [isVariance, prepared, series]);

  const showValueLabels = prepared.length <= 8;

  return (
    <div className="space-y-3">
      <ChartShell
        loading={loading}
        hasData={data.length > 0}
        emptyMessage={emptyMessage}
        heightClassName="h-[300px]"
      >
        <SafeResponsiveContainer>
          <BarChart data={prepared} margin={{ top: 18, right: 12, left: 4, bottom: 0 }}>
            {chartDefs([
              COLOR_SCHEDULED_FALLBACK,
              COLOR_ACTUAL_FALLBACK,
              COLOR_ALERT,
              UNDER_COLOR,
            ])}
            <CartesianGrid
              stroke={CHART_GRID_STROKE}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK_SUBTLE}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={56}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={CHART_AXIS_TICK}
              domain={yDomain}
              label={{
                value: isVariance ? 'Variance (h)' : 'Hours',
                angle: -90,
                position: 'insideLeft',
                fill: '#71717a',
                fontSize: 11,
              }}
            />
            <Tooltip
              cursor={CHART_BAR_CURSOR}
              content={
                <RichChartTooltip
                  formatValue={formatHours}
                  showShare={false}
                  footnote={
                    isVariance
                      ? 'Positive means more hours worked than scheduled.'
                      : undefined
                  }
                />
              }
            />

            {isVariance ? (
              <>
                <ReferenceLine y={0} stroke="rgba(212,212,216,0.5)" />
                <Bar
                  dataKey="variance"
                  name="Variance"
                  maxBarSize={44}
                  shape={<DepthBar />}
                  activeBar={<DepthBar active />}
                  animationDuration={650}
                >
                  {prepared.map((item) => (
                    <Cell key={item.name} fill={item.__color} />
                  ))}
                  {showValueLabels ? (
                    <LabelList
                      dataKey="variance"
                      position="top"
                      offset={10}
                      formatter={(value) => formatHours(Number(value ?? 0))}
                      {...CHART_VALUE_LABEL}
                    />
                  ) : null}
                </Bar>
              </>
            ) : (
              <>
                {series.isHidden(SCHEDULED_KEY) ? null : (
                  <Bar
                    dataKey="scheduled"
                    name="Scheduled"
                    maxBarSize={34}
                    shape={<DepthBar baseColor={COLOR_SCHEDULED_FALLBACK} />}
                    activeBar={<DepthBar baseColor={COLOR_SCHEDULED_FALLBACK} active />}
                    animationDuration={650}
                  />
                )}
                {series.isHidden(ACTUAL_KEY) ? null : (
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    maxBarSize={34}
                    shape={<DepthBar baseColor={COLOR_ACTUAL_FALLBACK} />}
                    activeBar={<DepthBar baseColor={COLOR_ACTUAL_FALLBACK} active />}
                    animationDuration={650}
                    animationBegin={120}
                  />
                )}
              </>
            )}
          </BarChart>
        </SafeResponsiveContainer>
      </ChartShell>

      {isVariance ? (
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: COLOR_ALERT }}
              aria-hidden
            />
            Over scheduled
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: UNDER_COLOR }}
              aria-hidden
            />
            Under scheduled
          </span>
        </div>
      ) : (
        <InteractiveChartLegend
          series={series}
          formatValue={formatHours}
          layout="inline"
        />
      )}
    </div>
  );
}
