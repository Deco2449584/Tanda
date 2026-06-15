/** Normalize AWB for consistent lookup (trim, uppercase, remove spaces/dashes). */
export function normalizeAwbNumber(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function formatAwbForDisplay(value: string): string {
  return value.trim().toUpperCase();
}
