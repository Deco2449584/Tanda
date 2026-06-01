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
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  COLOR_HORAS_NORMAL,
} from './chart-theme';
import type { WeeklyHoursDatum } from '@/lib/dashboard/types';

interface WeeklyHoursChartProps {
  data: WeeklyHoursDatum[];
  loading?: boolean;
}

export function WeeklyHoursChart({ data, loading = false }: WeeklyHoursChartProps) {
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
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          Weekly Hours Summary
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: COLOR_HORAS_NORMAL }}
          />
          Scheduled hours
        </span>
      </div>

      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="relative h-[280px] w-full min-w-[280px] sm:h-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-900/40">
            <span className="text-xs text-zinc-500">Loading data...</span>
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
                  <stop offset="0%" stopColor={COLOR_HORAS_NORMAL} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLOR_HORAS_NORMAL} stopOpacity={0} />
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
                formatter={(value) => [`${value} h`, 'Scheduled hours']}
              />
              <Area
                type="monotone"
                dataKey="horas"
                name="Scheduled hours"
                stroke={COLOR_HORAS_NORMAL}
                strokeWidth={2}
                fill="url(#fillHorasProgramadas)"
                dot={{ r: 3, fill: COLOR_HORAS_NORMAL }}
                activeDot={{
                  r: 5,
                  fill: COLOR_HORAS_NORMAL,
                  stroke: '#fff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : mounted && !loading ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500">
            No shifts in the current week.
          </div>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-zinc-800/30" />
        )}
        </div>
      </div>
    </section>
  );
}
