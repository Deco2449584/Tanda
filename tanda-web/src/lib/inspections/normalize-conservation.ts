import type { LucideIcon } from 'lucide-react';
import { Snowflake, Sun, Thermometer } from 'lucide-react';
import type { ConservationType } from '@/lib/types/cargo-inspection';

const LEGACY_CONSERVATION_MAP: Record<string, ConservationType> = {
  Congelado: 'Frozen',
  Refrigerado: 'Refrigerated',
  Ambiente: 'Ambient',
  Frozen: 'Frozen',
  Refrigerated: 'Refrigerated',
  Ambient: 'Ambient',
};

export function normalizeConservationType(
  value: string | undefined,
): ConservationType {
  if (!value) return 'Ambient';
  const trimmed = value.trim();
  return LEGACY_CONSERVATION_MAP[trimmed] ?? 'Ambient';
}

export function getConservationLabel(type: ConservationType): string {
  return type;
}

export const CONSERVATION_COLORS: Record<
  ConservationType,
  { bg: string; text: string }
> = {
  Frozen: { bg: '#DBEAFE', text: '#1E40AF' },
  Refrigerated: { bg: '#E0F2FE', text: '#0369A1' },
  Ambient: { bg: '#FEF3C7', text: '#B45309' },
};

export const CONSERVATION_ICONS: Record<ConservationType, LucideIcon> = {
  Frozen: Snowflake,
  Refrigerated: Thermometer,
  Ambient: Sun,
};
