const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function formatDayMonthYear(date: string): string {
  const parsed = parseDate(date);
  const month = MONTH_NAMES[parsed.getMonth()];
  return `${month} ${parsed.getDate()}, ${parsed.getFullYear()}`;
}

export function formatLeaveDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '—';

  if (startDate === endDate) {
    return `${formatDayMonthYear(startDate)} (1 día)`;
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const startMonth = MONTH_NAMES[start.getMonth()];
  const endMonth = MONTH_NAMES[end.getMonth()];

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${formatDayMonthYear(startDate)} - ${formatDayMonthYear(endDate)}`;
}

export function truncateText(text: string, maxLength = 48): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function requestOverlapsRange(
  requestStart: string,
  requestEnd: string,
  filterStart: string,
  filterEnd: string,
): boolean {
  return requestStart <= filterEnd && requestEnd >= filterStart;
}
