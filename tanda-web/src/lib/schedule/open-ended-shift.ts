/** Empty / missing end time means the roster slot has no planned finish. */
export function isOpenEndedShift(shift: { endTime?: string | null }): boolean {
  return !shift.endTime?.trim();
}

/**
 * 24h range for emails, notifications, and audit lines.
 * Closed: `09:00–17:00`. Open: `09:00 → open`.
 */
export function formatShiftTimeRangePlain(
  startTime: string,
  endTime?: string | null,
): string {
  const start = startTime.trim();
  const end = endTime?.trim() ?? '';
  if (!start && !end) return '';
  if (!end) return start ? `${start} → open` : '';
  if (!start) return end;
  return `${start}–${end}`;
}
