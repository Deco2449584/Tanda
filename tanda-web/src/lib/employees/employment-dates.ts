/** Returns today's date in YYYY-MM-DD (local timezone). */
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateEmploymentDates(
  startDate: string,
  endDate: string,
): string | null {
  const start = startDate.trim();
  const end = endDate.trim();

  if (!start) {
    return 'Start date is required.';
  }

  if (end && end < start) {
    return 'End date cannot be before the start date.';
  }

  return null;
}
