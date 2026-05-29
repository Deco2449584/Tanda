import { Timestamp } from 'firebase/firestore';

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

export function formatDateRangeLabel(range: DateRange): string {
  const formatter = new Intl.DateTimeFormat('es-MX', {
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
