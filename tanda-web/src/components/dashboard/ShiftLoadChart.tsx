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
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  COLOR_HORAS_NORMAL_FALLBACK,
} from './chart-theme';
import type { ShiftLoadDatum } from '@/lib/dashboard/types';

interface ShiftLoadChartProps {
  data: ShiftLoadDatum[];
  loading?: boolean;
}

export function ShiftLoadChart({ data, loading = false }: ShiftLoadChartProps) {
  const chartColor = COLOR_HORAS_NORMAL_FALLBACK;
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
    <Card padding="md" className="backdrop-blur-sm">
      <CardHeader className="mb-1">
        <CardTitle>Today&apos;s Operational Shift Load</CardTitle>
        <CardDescription>Shifts assigned by department</CardDescription>
      </CardHeader>

      <div className="mt-4 w-full overflow-x-auto scrollbar-hide">
        <div className="relative h-[220px] w-full min-w-[320px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface-raised/40">
            <LoadingIndicator message="Loading data…" className="py-0" />
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
                cursor={{ fill: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)' }}
              />
              <Bar
                dataKey="turnos"
                name="Shifts"
                fill={chartColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : mounted && !loading ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-subtle">
            No shifts scheduled for today.
          </div>
        ) : (
          <div className="h-full w-full animate-pulse rounded-lg bg-surface-hover/30" />
        )}
        </div>
      </div>
    </Card>
  );
}
