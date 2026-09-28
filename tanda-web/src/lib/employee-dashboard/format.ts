import { formatShiftTimeRange } from '@/lib/schedule/week';

export function formatShortDate(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  return parsed.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatShiftBlockLabel(
  date: string,
  startTime: string,
  endTime: string,
  status: 'scheduled' | 'completed',
): string {
  const timeRange = formatShiftTimeRange(startTime, endTime);
  const dayLabel = formatShortDate(date);

  if (status === 'completed') {
    return `${dayLabel}: ${timeRange} (Completed)`;
  }

  return `${dayLabel}: ${timeRange}`;
}
