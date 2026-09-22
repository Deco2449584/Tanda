import type { ConservationType } from '@/types';

export const CONSERVATION_COLORS: Record<ConservationType, { bg: string; text: string }> = {
  Frozen: { bg: '#DBEAFE', text: '#1E40AF' },
  Refrigerated: { bg: '#E0F2FE', text: '#0369A1' },
  Ambient: { bg: '#FEF3C7', text: '#B45309' },
};

export const CONSERVATION_ICONS = {
  Frozen: 'snow-outline',
  Refrigerated: 'thermometer-outline',
  Ambient: 'sunny-outline',
} as const;

export function getConservationLabel(type: ConservationType): string {
  return type;
}
