import { Timestamp } from 'firebase/firestore';
import { buildWeekRange } from '@/lib/schedule/week';

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
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    start: toInputDate(start),
    end: toInputDate(end),
  };
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

export function toFirestoreRangeBounds(range: DateRange): {
  start: Timestamp;
  end: Timestamp;
} {
  const startDate = new Date(`${range.start}T00:00:00`);
  const endDate = new Date(`${range.end}T23:59:59.999`);

  return {
    start: Timestamp.fromDate(startDate),
    end: Timestamp.fromDate(endDate),
  };
}

export function isValidDateRange(range: DateRange): boolean {
  if (!range.start || !range.end) return false;
  return range.start <= range.end;
}
