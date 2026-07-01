import { DASHBOARD_CHART_COLORS } from '@/lib/dashboard/chart-colors';

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#2e2e2e',
  borderColor: 'rgba(203, 203, 203, 0.2)',
  borderRadius: '8px',
  color: '#f5f5f5',
  fontSize: '12px',
} as const;

/** Hover band behind bar columns (Recharts default is light gray/white). */
export const CHART_BAR_CURSOR = {
  fill: 'rgba(255, 255, 255, 0.06)',
} as const;

/** Vertical hover guide for area/line charts. */
export const CHART_AREA_CURSOR = {
  stroke: 'rgba(161, 168, 179, 0.35)',
  strokeWidth: 1,
  strokeDasharray: '4 4',
} as const;

export const CHART_ACTIVE_DOT = {
  r: 5,
  stroke: 'rgba(255, 255, 255, 0.35)',
  strokeWidth: 2,
} as const;

export const CHART_AXIS_TICK = { fill: '#cbcbcb', fontSize: 11 } as const;

export const CHART_GRID_STROKE = 'rgba(203, 203, 203, 0.12)';

export const COLOR_HORAS_NORMAL_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_HORAS_EXTRA_FALLBACK = DASHBOARD_CHART_COLORS[1];
export const COLOR_SCHEDULED_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_ACTUAL_FALLBACK = DASHBOARD_CHART_COLORS[1];
