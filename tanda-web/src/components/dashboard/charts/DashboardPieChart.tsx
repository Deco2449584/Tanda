'use client';

import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import type { NamedValueDatum } from '@/lib/dashboard/types';
import { CategoryChart } from './CategoryChart';

interface DashboardPieChartProps {
  data: NamedValueDatum[];
  loading?: boolean;
  emptyMessage?: string;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
}

/** Thin wrapper kept so older dashboard imports keep compiling. */
export function DashboardPieChart({
  data,
  loading,
  emptyMessage,
  valueFormatter,
  showLegend = true,
}: DashboardPieChartProps) {
  return (
    <CategoryChart
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      valueFormatter={valueFormatter}
      chartType="donut"
      showLegend={showLegend}
    />
  );
}

export function DashboardCurrencyPieChart({
  data,
  currency,
  loading,
  emptyMessage,
}: DashboardPieChartProps & { currency: string }) {
  return (
    <DashboardPieChart
      data={data}
      loading={loading}
      emptyMessage={emptyMessage}
      valueFormatter={(value) => formatDashboardCurrency(value, currency)}
    />
  );
}
