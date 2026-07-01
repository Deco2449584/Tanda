'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  CHART_ACTIVE_DOT,
  CHART_AREA_CURSOR,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  COLOR_HORAS_NORMAL_FALLBACK,
} from './chart-theme';
import type { WeeklyHoursDatum } from '@/lib/dashboard/types';

interface WeeklyHoursChartProps {
  data: WeeklyHoursDatum[];
  loading?: boolean;
}

export function WeeklyHoursChart({ data, loading = false }: WeeklyHoursChartProps) {
  const chartColor = COLOR_HORAS_NORMAL_FALLBACK;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const yMax = useMemo(() => {
    const max = Math.max(...data.map((item) => item.horas), 0);
    return Math.max(10, Math.ceil(max / 10) * 10);
  }, [data]);

  const yTicks = useMemo(() => {
    const step = yMax <= 20 ? 5 : 10;
    const ticks: number[] = [];
    for (let value = 0; value <= yMax; value += step) {
      ticks.push(value);
    }
    return ticks;
  }, [yMax]);

  return (
    <Card padding="md" className="backdrop-blur-sm">
      <CardHeader className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Weekly Hours Summary</CardTitle>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: chartColor }}
          />
          Scheduled hours
        </span>
      </CardHeader>

      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="relative h-[280px] w-full min-w-[280px] sm:h-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface-raised/40">
            <LoadingIndicator message="Loading data…" className="py-0" />
          </div>
        )}

        {mounted && data.some((item) => item.horas > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillHorasProgramadas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
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
                ticks={yTicks}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: '#fafafa' }}
                itemStyle={{ color: '#e4e4e7' }}
                cursor={CHART_AREA_CURSOR}
                formatter={(value) => [`${value} h`, 'Scheduled hours']}
              />
              <Area
                type="monotone"
                dataKey="horas"
                name="Scheduled hours"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#fillHorasProgramadas)"
                dot={{ r: 3, fill: chartColor }}
                activeDot={{
                  ...CHART_ACTIVE_DOT,
                  fill: chartColor,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : mounted && !loading ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-subtle">
            No shifts in the current week.
          </div>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-surface-hover/30" />
        )}
        </div>
      </div>
    </Card>
  );
}
