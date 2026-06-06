/** Fecha local en formato YYYY-MM-DD (mismo que Firestore en shifts). */
export function toInputDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Normaliza variantes como 2026-5-2 → 2026-05-02 para comparar. */
export function normalizeInputDate(value: string): string {
  const match = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return value.trim();

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function compareInputDates(a: string, b: string): number {
  return normalizeInputDate(a).localeCompare(normalizeInputDate(b));
}

export function isOnOrAfterToday(date: string): boolean {
  return compareInputDates(date, toInputDate()) >= 0;
}

export function isDateInRange(
  date: string,
  start: string,
  end: string,
): boolean {
  const normalized = normalizeInputDate(date);
  return (
    compareInputDates(normalized, start) >= 0 &&
    compareInputDates(normalized, end) <= 0
  );
}

export function offsetInputDate(
  reference: string | Date = new Date(),
  dayOffset = 0,
): string {
  const base =
    typeof reference === 'string'
      ? new Date(`${normalizeInputDate(reference)}T12:00:00`)
      : new Date(reference);
  base.setDate(base.getDate() + dayOffset);
  return toInputDate(base);
}
