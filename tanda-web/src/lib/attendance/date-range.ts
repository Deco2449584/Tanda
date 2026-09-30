import { Timestamp } from 'firebase/firestore';
import { zonedRangeBounds } from '@/lib/dates/timezone';
import { buildWeekRange, formatWeekRangeLabel } from '@/lib/schedule/week';
import { DEFAULT_COMPANY_SETTINGS } from '@/lib/types/company-settings';

export interface DateRange {
  start: string;
  end: string;
}

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDefaultDateRange(): DateRange {
  return getCurrentWeekDateRange();
}

export function getCurrentWeekDateRange(reference: Date = new Date()): DateRange {
  const week = buildWeekRange(reference);
  return { start: week.start, end: week.end };
}

export function formatPayPeriodLabel(range: DateRange): string {
  const week = buildWeekRange(new Date(`${range.start}T12:00:00`));
  if (week.start === range.start && week.end === range.end) {
    return `Week ${formatWeekRangeLabel(week)}`;
  }

  return formatDateRangeLabel(range);
}

export function getTodayRange(reference: Date = new Date()): DateRange {
  const day = toInputDate(reference);
  return { start: day, end: day };
}

export function getLastWeekRange(reference: Date = new Date()): DateRange {
  const previous = new Date(reference);
  previous.setDate(previous.getDate() - 7);
  const week = buildWeekRange(previous);
  return { start: week.start, end: week.end };
}

export function getLast7DaysRange(reference: Date = new Date()): DateRange {
  const end = toInputDate(reference);
  const startDate = new Date(reference);
  startDate.setDate(startDate.getDate() - 6);

  return {
    start: toInputDate(startDate),
    end,
  };
}

export function getLast30DaysRange(reference: Date = new Date()): DateRange {
  const end = toInputDate(reference);
  const startDate = new Date(reference);
  startDate.setDate(startDate.getDate() - 29);

  return {
    start: toInputDate(startDate),
    end,
  };
}

export function getCurrentMonthRange(reference: Date = new Date()): DateRange {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
}

export function formatDateRangeLabel(range: DateRange): string {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const start = new Date(`${range.start}T00:00:00`);
  const end = new Date(`${range.end}T00:00:00`);

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function toFirestoreRangeBounds(
  range: DateRange,
  timeZone: string = DEFAULT_COMPANY_SETTINGS.timeZone,
): {
  start: Timestamp;
  end: Timestamp;
} {
  const { start, end } = zonedRangeBounds(range.start, range.end, timeZone);

  return {
    start: Timestamp.fromDate(start),
    end: Timestamp.fromDate(end),
  };
}

export function isValidDateRange(range: DateRange): boolean {
  if (!range.start || !range.end) return false;
  return range.start <= range.end;
}
