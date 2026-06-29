import { DASHBOARD_CHART_COLORS } from '@/lib/dashboard/chart-colors';

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#2e2e2e',
  borderColor: 'rgba(203, 203, 203, 0.2)',
  borderRadius: '8px',
  color: '#f5f5f5',
  fontSize: '12px',
} as const;

export const CHART_AXIS_TICK = { fill: '#cbcbcb', fontSize: 11 } as const;

export const CHART_GRID_STROKE = 'rgba(203, 203, 203, 0.12)';

export const COLOR_HORAS_NORMAL_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_HORAS_EXTRA_FALLBACK = DASHBOARD_CHART_COLORS[1];
export const COLOR_SCHEDULED_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_ACTUAL_FALLBACK = DASHBOARD_CHART_COLORS[1];
