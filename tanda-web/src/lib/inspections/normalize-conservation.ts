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
