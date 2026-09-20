import type { DateRange } from '@/lib/attendance/date-range';

const DAY_MS = 24 * 60 * 60 * 1000;

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rangeLengthInDays(range: DateRange): number {
  const start = new Date(`${range.start}T12:00:00`).getTime();
  const end = new Date(`${range.end}T12:00:00`).getTime();
  return Math.max(1, Math.round((end - start) / DAY_MS) + 1);
}

/**
 * Immediately preceding window of the same length, so totals are comparable
 * (a 7-day range compares against the previous 7 days, not the previous week
 * on the calendar).
 */
export function getPreviousRange(range: DateRange): DateRange {
  const days = rangeLengthInDays(range);
  const previousEnd = new Date(`${range.start}T12:00:00`);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  return { start: toKey(previousStart), end: toKey(previousEnd) };
}

export function buildPreviousValueMap(
  entries: Array<{ name: string; value: number }>,
): Map<string, number> {
  return new Map(entries.map((entry) => [entry.name, entry.value]));
}
