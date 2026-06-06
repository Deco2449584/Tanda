import type { CargoInspection } from '@/lib/types/cargo-inspection';

export type InspectionDatePreset = 'day' | 'week' | 'month' | 'custom';

export interface InspectionDateRange {
  from: Date;
  to: Date;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getTodayInspectionRange(): InspectionDateRange {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now) };
}

export function getWeekInspectionRange(reference = new Date()): InspectionDateRange {
  const day = reference.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: startOfDay(monday), to: endOfDay(sunday) };
}

export function getMonthInspectionRange(reference = new Date()): InspectionDateRange {
  const from = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const to = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to) };
}

export function getInspectionDateRangeForPreset(
  preset: InspectionDatePreset,
  customFrom: Date,
  customTo: Date,
): InspectionDateRange {
  switch (preset) {
    case 'day':
      return getTodayInspectionRange();
    case 'week':
      return getWeekInspectionRange();
    case 'month':
      return getMonthInspectionRange();
    case 'custom':
      return { from: startOfDay(customFrom), to: endOfDay(customTo) };
    default:
      return getTodayInspectionRange();
  }
}

function inspectionRegisteredAt(inspection: CargoInspection): Date {
  return new Date(inspection.registeredAt);
}

export function filterInspectionsBySearch(
  inspections: CargoInspection[],
  query: string,
): CargoInspection[] {
  const q = query.trim().toLowerCase();
  if (!q) return inspections;

  return inspections.filter((item) => {
    const uldId = item.uldId.toLowerCase();
    const awbNumber = item.awbNumber.toLowerCase();
    const foodType = item.foodType.toLowerCase();
    return (
      uldId.includes(q) ||
      awbNumber.includes(q) ||
      foodType.includes(q)
    );
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
    const t = inspectionRegisteredAt(item).getTime();
    return t >= fromMs && t <= toMs;
  });
}

export function sortInspectionsByNewest(
  inspections: CargoInspection[],
): CargoInspection[] {
  return [...inspections].sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}
