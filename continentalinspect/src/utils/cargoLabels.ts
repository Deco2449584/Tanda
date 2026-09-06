import type { ConservationType } from '@/types';

export const CONSERVATION_COLORS: Record<ConservationType, { bg: string; text: string }> = {
  Frozen: { bg: '#DBEAFE', text: '#1E40AF' },
  Refrigerated: { bg: '#E0F2FE', text: '#0369A1' },
  Ambient: { bg: '#F3F4F6', text: '#374151' },
};

export function getConservationLabel(type: ConservationType): string {
  return type;
}
