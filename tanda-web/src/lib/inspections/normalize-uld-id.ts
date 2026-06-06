/** Normalizes ULD identifiers for storage and lookup (e.g. AKE 12345 CX). */
export function normalizeUldId(uldId: string): string {
  return uldId.trim().replace(/\s+/g, ' ').toUpperCase();
}
