import type { CargoInspection } from '@/types';

export type DateFilterPreset = 'day' | 'week' | 'month' | 'custom';

export type DateRange = {
  from: Date;
  to: Date;
};

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getTodayRange(): DateRange {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now) };
}

export function getWeekRange(reference = new Date()): DateRange {
  const day = reference.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: startOfDay(monday), to: endOfDay(sunday) };
}

export function getMonthRange(reference = new Date()): DateRange {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function formatFilterDate(date: Date): string {
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function inspectionDate(inspection: CargoInspection): Date {
  return new Date(inspection.registeredAt);
}

/** Filters inspections by ULD ID or AWB number only. */
export function filterInspectionsBySearch(
  inspections: CargoInspection[],
  query: string,
): CargoInspection[] {
  const q = query.trim().toLowerCase();
  if (!q) return inspections;

  return inspections.filter((item) => {
    const uldId = item.uldId.toLowerCase();
    const awbNumber = item.awbNumber.toLowerCase();
    return uldId.includes(q) || awbNumber.includes(q);
  });
}

export function filterInspectionsByDateRange(
  inspections: CargoInspection[],
  from: Date,
  to: Date,
): CargoInspection[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();

  return inspections.filter((item) => {
    const t = inspectionDate(item).getTime();
    return t >= fromMs && t <= toMs;
  });
}

export function filterInspectionsToday(inspections: CargoInspection[]): CargoInspection[] {
  const { from, to } = getTodayRange();
  return filterInspectionsByDateRange(inspections, from, to);
}

export function startOfMonth(reference = new Date()): Date {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

export function getDateRangeForPreset(
  preset: DateFilterPreset,
  customFrom: Date,
  customTo: Date,
): { from: Date; to: Date } {
  switch (preset) {
    case 'day':
      return getTodayRange();
    case 'week':
      return getWeekRange();
    case 'month':
      return getMonthRange();
    case 'custom':
      return {
        from: startOfDay(customFrom),
        to: endOfDay(customTo),
      };
    default:
      return getTodayRange();
  }
}
