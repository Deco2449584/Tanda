'use client';

import { CategoryChart } from './CategoryChart';
import type { NamedValueDatum } from '@/lib/dashboard/types';

interface DashboardBarChartProps {
  data: NamedValueDatum[];
  loading?: boolean;
  emptyMessage?: string;
  dataKey?: string;
  valueLabel?: string;
  yAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  variedColors?: boolean;
}

/** Thin wrapper kept so older dashboard imports keep compiling. */
export function DashboardBarChart({
  data,
  loading,
  emptyMessage,
  valueLabel,
  yAxisLabel,
  valueFormatter,
  color,
  variedColors,
}: DashboardBarChartProps) {
  return (
    <CategoryChart
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      valueLabel={valueLabel}
      yAxisLabel={yAxisLabel}
      valueFormatter={valueFormatter}
      color={variedColors === false ? color : undefined}
      chartType="bar"
    />
  );
}
