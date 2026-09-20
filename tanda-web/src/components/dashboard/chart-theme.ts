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

export const CHART_AXIS_TICK = { fill: '#d4d4d8', fontSize: 11 } as const;

/** Smaller tick style for dense axes (per-day trends, horizontal bars). */
export const CHART_AXIS_TICK_SUBTLE = {
  fill: '#a1a1aa',
  fontSize: 10,
} as const;

export const CHART_GRID_STROKE = 'rgba(203, 203, 203, 0.1)';

/** Average / target guides drawn over the plot area. */
export const CHART_REFERENCE_LINE = {
  stroke: 'rgba(212, 212, 216, 0.45)',
  strokeDasharray: '5 4',
  strokeWidth: 1,
} as const;

export const CHART_VALUE_LABEL = {
  fill: '#e4e4e7',
  fontSize: 11,
  fontWeight: 600,
} as const;

/** Semantic colors for deltas, variance and alert highlighting. */
export const COLOR_POSITIVE = '#22c55e';
export const COLOR_NEGATIVE = '#fb7185';
export const COLOR_NEUTRAL = '#a1a1aa';
export const COLOR_ALERT = '#f97316';

export const COLOR_HORAS_NORMAL_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_HORAS_EXTRA_FALLBACK = DASHBOARD_CHART_COLORS[1];
export const COLOR_SCHEDULED_FALLBACK = DASHBOARD_CHART_COLORS[0];
export const COLOR_ACTUAL_FALLBACK = DASHBOARD_CHART_COLORS[1];
