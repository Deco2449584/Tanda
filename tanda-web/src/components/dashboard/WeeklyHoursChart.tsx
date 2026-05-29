'use client';

import { useEffect, useState } from 'react';
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
  COLOR_HORAS_EXTRA,
  COLOR_HORAS_NORMAL,
} from './chart-theme';
import { weeklyHoursData } from './mock-data';

export function WeeklyHoursChart() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          Resumen de Horas Semanales
        </h2>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_HORAS_NORMAL }}
            />
            Horas normal
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_HORAS_EXTRA }}
            />
            Horas extra
          </span>
        </div>
      </div>

      <div className="h-[320px] w-full min-w-0">
        {mounted ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={weeklyHoursData}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillHorasNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_HORAS_NORMAL} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLOR_HORAS_NORMAL} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillHorasExtra" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR_HORAS_EXTRA} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLOR_HORAS_EXTRA} stopOpacity={0} />
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
              domain={[0, 50]}
              ticks={[0, 10, 20, 30, 40, 50]}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={{ color: '#fafafa' }}
              itemStyle={{ color: '#e4e4e7' }}
            />
            <Area
              type="monotone"
              dataKey="horasNormal"
              name="Horas normal"
              stroke={COLOR_HORAS_NORMAL}
              strokeWidth={2}
              fill="url(#fillHorasNormal)"
              dot={false}
              activeDot={{ r: 5, fill: COLOR_HORAS_NORMAL, stroke: '#fff', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="horasExtra"
              name="Horas extra"
              stroke={COLOR_HORAS_EXTRA}
              strokeWidth={2}
              fill="url(#fillHorasExtra)"
              dot={false}
              activeDot={{ r: 5, fill: COLOR_HORAS_EXTRA, stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-lg bg-zinc-800/30" />
        )}
      </div>
    </section>
  );
}
