'use client';

import { useEffect, useState } from 'react';
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
import { shiftLoadData } from './mock-data';

export function ShiftLoadChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="mb-1">
        <h2 className="text-sm font-semibold text-zinc-100">
          Carga Operativa de Turnos Hoy
        </h2>
        <p className="text-xs text-zinc-500">Horas por departamento</p>
      </div>

      <div className="mt-4 h-[220px] w-full min-w-0">
        {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={shiftLoadData}
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
              domain={[0, 15]}
              ticks={[0, 5, 10, 15]}
              label={{
                value: 'Horas',
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
              cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
            />
            <Bar
              dataKey="horas"
              name="Horas"
              fill={COLOR_HORAS_NORMAL}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-lg bg-zinc-800/30" />
        )}
      </div>
    </section>
  );
}
