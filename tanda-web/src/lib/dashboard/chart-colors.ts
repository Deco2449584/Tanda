/** Distinct palette for dashboard charts — one color per series or bar. */
export const DASHBOARD_CHART_COLORS = [
  '#38bdf8',
  '#22c55e',
  '#a78bfa',
  '#f59e0b',
  '#2dd4bf',
  '#818cf8',
  '#fb7185',
  '#34d399',
  '#e879f9',
  '#94a3b8',
  '#f97316',
  '#06b6d4',
] as const;

export function getDashboardChartColor(index: number): string {
  return DASHBOARD_CHART_COLORS[index % DASHBOARD_CHART_COLORS.length];
}
