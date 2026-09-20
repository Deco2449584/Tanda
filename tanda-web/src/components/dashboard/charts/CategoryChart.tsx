'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardChartColor } from '@/lib/dashboard/chart-colors';
import type { NamedValueDatum } from '@/lib/dashboard/types';
import type { DeltaSentiment } from '@/lib/dashboard/delta';
import {
  CHART_AXIS_TICK,
  CHART_AXIS_TICK_SUBTLE,
  CHART_BAR_CURSOR,
  CHART_GRID_STROKE,
  CHART_REFERENCE_LINE,
  CHART_VALUE_LABEL,
  COLOR_HORAS_NORMAL_FALLBACK,
  COLOR_NEGATIVE,
} from '../chart-theme';
import { ChartShell } from './ChartShell';
import { chartDefs, DepthBar, DepthPieSector } from './chart-decor';
import { InteractiveChartLegend } from './InteractiveChartLegend';
import { RichChartTooltip } from './RichChartTooltip';
import { SafeResponsiveContainer } from './SafeResponsiveContainer';
import { useChartSeries, type ChartSeriesEntry } from './useChartSeries';

export type CategoryChartType = 'bar' | 'donut';
export type CategorySort = 'value' | 'name' | 'none';
export type CategoryTopN = number | 'all';

interface CategoryChartProps {
  data: NamedValueDatum[];
  loading?: boolean;
  emptyMessage?: string;
  valueLabel?: string;
  valueFormatter?: (value: number) => string;
  /** Axis caption for the value axis (bar mode only). */
  yAxisLabel?: string;
  /** Single color for every bar; omit for one palette color per category. */
  color?: string;
  chartType?: CategoryChartType;
  /** `rows` renders horizontal bars, better for long category names. */
  orientation?: 'columns' | 'rows';
  sort?: CategorySort;
  topN?: CategoryTopN;
  /** Same categories from the previous period, for tooltip deltas. */
  previousByKey?: Map<string, number>;
  deltaSentiment?: DeltaSentiment;
  /** Draw a dashed guide at the mean of the visible values. */
  showAverage?: boolean;
  /** Paint the largest (or smallest) visible bar in the alert color. */
  highlightExtreme?: 'max' | 'min';
  showLegend?: boolean;
  height?: number;
}

export function CategoryChart({
  data,
  loading = false,
  emptyMessage = 'No data for the selected filters.',
  valueLabel = 'Value',
  valueFormatter,
  yAxisLabel,
  color,
  chartType = 'bar',
  orientation = 'columns',
  sort = 'value',
  topN = 'all',
  previousByKey,
  deltaSentiment = 'neutral',
  showAverage = false,
  highlightExtreme,
  showLegend = true,
  height,
}: CategoryChartProps) {
  const formatValue = useMemo(
    () => valueFormatter ?? ((value: number) => value.toLocaleString('en-AU')),
    [valueFormatter],
  );

  /** Colors are keyed to the incoming order so they never shuffle on sort. */
  const colorByName = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((item, index) => {
      map.set(item.name, color ?? getDashboardChartColor(index));
    });
    return map;
  }, [color, data]);

  const prepared = useMemo(() => {
    const sorted = [...data];
    if (sort === 'value') sorted.sort((a, b) => b.value - a.value);
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    return topN === 'all' ? sorted : sorted.slice(0, topN);
  }, [data, sort, topN]);

  const entries: ChartSeriesEntry[] = useMemo(
    () =>
      prepared.map((item) => ({
        key: item.name,
        label: item.name,
        color: colorByName.get(item.name) ?? COLOR_HORAS_NORMAL_FALLBACK,
        value: item.value,
      })),
    [colorByName, prepared],
  );

  const series = useChartSeries(entries);

  const extremeName = useMemo(() => {
    const visible = series.visibleEntries;
    if (!highlightExtreme || visible.length < 2) return null;
    return visible.reduce((best, item) =>
      highlightExtreme === 'max'
        ? item.value > best.value
          ? item
          : best
        : item.value < best.value
          ? item
          : best,
    ).key;
  }, [highlightExtreme, series.visibleEntries]);

  const chartData = useMemo(
    () =>
      series.visibleEntries.map((entry) => ({
        name: entry.label,
        value: entry.value,
        __color: entry.key === extremeName ? COLOR_NEGATIVE : entry.color,
      })),
    [extremeName, series.visibleEntries],
  );

  const average = useMemo(
    () =>
      chartData.length > 0
        ? Math.round((series.visibleTotal / chartData.length) * 100) / 100
        : 0,
    [chartData.length, series.visibleTotal],
  );

  const valueMax = useMemo(() => {
    const max = Math.max(...chartData.map((item) => item.value), 0);
    if (max <= 10) return Math.max(5, Math.ceil(max));
    return Math.ceil(max / 5) * 5;
  }, [chartData]);

  const tooltip = (
    <Tooltip
      cursor={CHART_BAR_CURSOR}
      content={
        <RichChartTooltip
          formatValue={formatValue}
          total={series.visibleTotal}
          rankOf={series.rankOf}
          rankTotal={series.visibleEntries.length}
          previousByKey={previousByKey}
          deltaSentiment={deltaSentiment}
        />
      }
    />
  );

  const legend = showLegend ? (
    <InteractiveChartLegend
      series={series}
      formatValue={formatValue}
      layout={chartType === 'donut' ? 'stack' : 'inline'}
    />
  ) : null;

  if (chartType === 'donut') {
    return (
      <ChartShell
        loading={loading}
        hasData={data.length > 0}
        emptyMessage={emptyMessage}
        fitContent
      >
        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(210px,300px)]">
          <div className="relative h-[250px] sm:h-[290px]">
            <SafeResponsiveContainer>
              <PieChart>
                {chartDefs()}
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="84%"
                  paddingAngle={2}
                  stroke="rgba(9, 9, 11, 0.55)"
                  strokeWidth={2}
                  activeShape={<DepthPieSector />}
                  animationDuration={650}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.__color} />
                  ))}
                </Pie>
                {tooltip}
              </PieChart>
            </SafeResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle">
                {series.hasHidden ? 'Visible total' : 'Total'}
              </span>
              <span className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">
                {formatValue(series.visibleTotal)}
              </span>
              <span className="mt-0.5 text-[11px] text-subtle">
                {series.visibleEntries.length} categories
              </span>
            </div>
          </div>

          {legend}
        </div>
      </ChartShell>
    );
  }

  const isRows = orientation === 'rows';
  const rowsHeight = Math.max(200, chartData.length * 44 + 40);
  const shellHeight = height ?? (isRows ? rowsHeight : 290);
  const showValueLabels = chartData.length <= 12;

  return (
    <div className="space-y-3">
      <ChartShell
        loading={loading}
        hasData={data.length > 0}
        emptyMessage={emptyMessage}
        height={shellHeight}
      >
        <SafeResponsiveContainer>
          <BarChart
            data={chartData}
            layout={isRows ? 'vertical' : 'horizontal'}
            margin={
              isRows
                ? { top: 12, right: 52, left: 4, bottom: 4 }
                : { top: 18, right: 16, left: 4, bottom: 4 }
            }
          >
            {chartDefs()}
            <CartesianGrid
              stroke={CHART_GRID_STROKE}
              strokeDasharray="3 3"
              vertical={isRows}
              horizontal={!isRows}
            />

            {isRows ? (
              <>
                <XAxis
                  type="number"
                  domain={[0, valueMax]}
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK_SUBTLE}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={CHART_AXIS_TICK}
                  width={150}
                  interval={0}
                />
              </>
            ) : (
              <>
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
                  domain={[0, valueMax]}
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
              </>
            )}

            {tooltip}

            {showAverage && average > 0 ? (
              <ReferenceLine
                {...(isRows ? { x: average } : { y: average })}
                {...CHART_REFERENCE_LINE}
                label={{
                  value: `Avg ${formatValue(average)}`,
                  position: isRows ? 'top' : 'right',
                  fill: '#a1a1aa',
                  fontSize: 10,
                }}
              />
            ) : null}

            <Bar
              dataKey="value"
              name={valueLabel}
              maxBarSize={isRows ? 26 : 54}
              shape={<DepthBar />}
              activeBar={<DepthBar active />}
              animationDuration={650}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.__color} />
              ))}
              {showValueLabels ? (
                <LabelList
                  dataKey="value"
                  position={isRows ? 'right' : 'top'}
                  offset={isRows ? 10 : 12}
                  formatter={(value) => formatValue(Number(value ?? 0))}
                  {...CHART_VALUE_LABEL}
                />
              ) : null}
            </Bar>
          </BarChart>
        </SafeResponsiveContainer>
      </ChartShell>

      {legend}
    </div>
  );
}
