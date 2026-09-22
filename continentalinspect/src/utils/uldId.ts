/** Normalizes ULD identifiers for storage and lookup (e.g. AKE 12345 CX). */
export function normalizeUldId(uldId: string): string {
  const collapsed = uldId.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!collapsed) {
    return '';
  }

  // Compact barcode/OCR forms: AKE12345CX → AKE 12345 CX
  const compact = collapsed.replace(/[\s-]/g, '');
  const match = compact.match(/^([A-Z]{3})(\d{4,5})([A-Z]{2,3})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }

  return collapsed;
}

export function hasUldId(uldId: string): boolean {
  return normalizeUldId(uldId).length > 0;
}
