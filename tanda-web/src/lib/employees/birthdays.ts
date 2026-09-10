import type { Employee } from '@/lib/types/employee';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface BirthdayEntry {
  employeeDocId: string;
  employeeCode: string;
  name: string;
  photoUrl?: string;
  department: string;
  active: boolean;
  dateOfBirth: string;
  month: number;
  day: number;
  /** Age the person turns on their birthday in `year`. */
  ageTurning: number;
  /** Calendar date of the birthday in `year` (YYYY-MM-DD). */
  occurrenceInYear: string;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Resolve birthday day for a year (Feb 29 → Feb 28 in non-leap years). */
export function birthdayDayInYear(
  month: number,
  day: number,
  year: number,
): { month: number; day: number } {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return { month: 2, day: 28 };
  }
  return { month, day };
}

export function parseDateOfBirth(value: string | undefined): {
  year: number;
  month: number;
  day: number;
} | null {
  const trimmed = value?.trim() ?? '';
  if (!DOB_PATTERN.test(trimmed)) return null;

  const [yearRaw, monthRaw, dayRaw] = trimmed.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function buildBirthdayEntries(
  employees: readonly Employee[],
  year: number,
  options?: { activeOnly?: boolean },
): BirthdayEntry[] {
  const activeOnly = options?.activeOnly ?? true;
  const entries: BirthdayEntry[] = [];

  for (const employee of employees) {
    if (activeOnly && !employee.active) continue;

    const dob = parseDateOfBirth(employee.dateOfBirth);
    if (!dob) continue;

    const occurrence = birthdayDayInYear(dob.month, dob.day, year);
    const ageTurning = year - dob.year;

    if (ageTurning < 0 || ageTurning > 120) continue;

    entries.push({
      employeeDocId: employee.id,
      employeeCode: employee.employeeId,
      name: employee.name.trim() || employee.employeeId,
      photoUrl: employee.photoUrl,
      department: employee.department?.trim() || '',
      active: employee.active,
      dateOfBirth: employee.dateOfBirth!.trim(),
      month: occurrence.month,
      day: occurrence.day,
      ageTurning,
      occurrenceInYear: `${year}-${pad2(occurrence.month)}-${pad2(occurrence.day)}`,
    });
  }

  entries.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export function groupBirthdaysByMonth(
  entries: BirthdayEntry[],
): Map<number, BirthdayEntry[]> {
  const groups = new Map<number, BirthdayEntry[]>();
  for (let month = 1; month <= 12; month += 1) {
    groups.set(month, []);
  }
  for (const entry of entries) {
    groups.get(entry.month)?.push(entry);
  }
  return groups;
}

export function getUpcomingBirthdays(
  entries: BirthdayEntry[],
  reference: Date = new Date(),
  limit = 8,
): BirthdayEntry[] {
  const todayKey = `${reference.getFullYear()}-${pad2(reference.getMonth() + 1)}-${pad2(reference.getDate())}`;
  const year = reference.getFullYear();

  const scored = entries.map((entry) => {
    let occurrence = entry.occurrenceInYear;
    if (occurrence < todayKey) {
      const next = birthdayDayInYear(entry.month, entry.day, year + 1);
      occurrence = `${year + 1}-${pad2(next.month)}-${pad2(next.day)}`;
    }
    return { entry, occurrence };
  });

  scored.sort((a, b) => {
    if (a.occurrence !== b.occurrence) {
      return a.occurrence.localeCompare(b.occurrence);
    }
    return a.entry.name.localeCompare(b.entry.name);
  });

  return scored.slice(0, limit).map((item) => item.entry);
}

export function daysUntilBirthday(
  entry: BirthdayEntry,
  reference: Date = new Date(),
): number {
  const today = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  let target = new Date(reference.getFullYear(), entry.month - 1, entry.day);
  if (target < today) {
    target = new Date(reference.getFullYear() + 1, entry.month - 1, entry.day);
  }
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
