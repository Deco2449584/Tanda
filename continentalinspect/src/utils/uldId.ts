/** Normalizes ULD identifiers for storage and lookup (e.g. AKE 12345 CX). */
export function normalizeUldId(uldId: string): string {
  return uldId.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function hasUldId(uldId: string): boolean {
  return normalizeUldId(uldId).length > 0;
}
