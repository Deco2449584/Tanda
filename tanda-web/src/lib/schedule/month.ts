import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { enAU } from 'date-fns/locale';
import { toInputDate } from '@/lib/dates/input-date';

export interface CalendarDayCell {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  label: string;
}

export interface MonthRange {
  start: string;
  end: string;
  label: string;
  days: CalendarDayCell[];
}

const WEEK_STARTS_ON = 1;

export function buildMonthCalendar(referenceDate: Date = new Date()): MonthRange {
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd }).map(
    (day) => ({
      date: toInputDate(day),
      dayNumber: day.getDate(),
      isCurrentMonth: isSameMonth(day, referenceDate),
      label: format(day, 'EEE', { locale: enAU }),
    }),
  );

  return {
    start: toInputDate(monthStart),
    end: toInputDate(monthEnd),
    label: format(referenceDate, 'MMMM yyyy', { locale: enAU }),
    days,
  };
}

export function shiftMonth(referenceDate: Date, direction: -1 | 1): Date {
  return addMonths(referenceDate, direction);
}
