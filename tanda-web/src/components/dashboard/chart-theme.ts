import { BRAND } from '@/lib/brand/tokens';

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#2e2e2e',
  borderColor: 'rgba(203, 203, 203, 0.2)',
  borderRadius: '8px',
  color: '#f5f5f5',
  fontSize: '12px',
} as const;

export const CHART_AXIS_TICK = { fill: '#cbcbcb', fontSize: 11 } as const;

export const CHART_GRID_STROKE = 'rgba(203, 203, 203, 0.12)';

export const COLOR_HORAS_NORMAL_FALLBACK = BRAND.magenta;
export const COLOR_HORAS_EXTRA_FALLBACK = BRAND.charcoal;
