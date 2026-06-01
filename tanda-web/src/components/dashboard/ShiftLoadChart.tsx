'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
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
import type { ShiftLoadDatum } from '@/lib/dashboard/types';

interface ShiftLoadChartProps {
  data: ShiftLoadDatum[];
  loading?: boolean;
}

export function ShiftLoadChart({ data, loading = false }: ShiftLoadChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const yMax = useMemo(() => {
    const max = Math.max(...data.map((item) => item.turnos), 0);
    return Math.max(5, Math.ceil(max / 5) * 5);
  }, [data]);

  const yTicks = useMemo(() => {
    const step = yMax <= 10 ? 2 : 5;
    const ticks: number[] = [];
    for (let value = 0; value <= yMax; value += step) {
      ticks.push(value);
    }
    return ticks;
  }, [yMax]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="mb-1">
        <h2 className="text-sm font-semibold text-zinc-100">
          Today&apos;s Operational Shift Load
        </h2>
        <p className="text-xs text-zinc-500">Shifts assigned by department</p>
      </div>

      <div className="mt-4 w-full overflow-x-auto scrollbar-hide">
        <div className="relative h-[220px] w-full min-w-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-zinc-900/40">
            <span className="text-xs text-zinc-500">Loading data...</span>
          </div>
        )}

        {mounted && data.length > 0 ? (
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
                dataKey="department"
                axisLine={false}
                tickLine={false}
                tick={CHART_AXIS_TICK}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={CHART_AXIS_TICK}
                domain={[0, yMax]}
                ticks={yTicks}
                allowDecimals={false}
                label={{
                  value: 'Shifts',
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
                cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
              />
              <Bar
                dataKey="turnos"
                name="Shifts"
                fill={COLOR_HORAS_NORMAL}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : mounted && !loading ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-500">
            No shifts scheduled for today.
          </div>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-zinc-800/30" />
        )}
        </div>
      </div>
    </section>
  );
}
