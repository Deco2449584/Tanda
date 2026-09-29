import type { CargoInspection } from '@/lib/types/cargo-inspection';
import { formatPersonName } from '@/lib/inspections/status';

export type InspectionDatePreset = 'day' | 'week' | 'month' | 'custom';

export interface InspectionDateRange {
  from: Date;
  to: Date;
}

export interface InspectionFilterOption {
  value: string;
  label: string;
}

/** Sentinel for inspections with no client/site assigned. */
export const INSPECTION_CLIENT_UNASSIGNED = '__unassigned__';

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

export function resolveInspectionClientKey(inspection: CargoInspection): string {
  const id =
    inspection.clientLocationId?.trim() ||
    inspection.portalClientId?.trim() ||
    '';
  return id || INSPECTION_CLIENT_UNASSIGNED;
}

export function resolveInspectionEmployeeKey(inspection: CargoInspection): string {
  return inspection.createdBy?.trim().toLowerCase() || '';
}

export function buildInspectionClientOptions(
  inspections: CargoInspection[],
): InspectionFilterOption[] {
  const byKey = new Map<string, string>();
  let hasUnassigned = false;

  for (const inspection of inspections) {
    const key = resolveInspectionClientKey(inspection);
    if (key === INSPECTION_CLIENT_UNASSIGNED) {
      hasUnassigned = true;
      continue;
    }
    const label = inspection.clientLocationName?.trim() || key;
    if (!byKey.has(key)) {
      byKey.set(key, label);
    }
  }

  const options = Array.from(byKey.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

  if (hasUnassigned) {
    options.push({ value: INSPECTION_CLIENT_UNASSIGNED, label: 'Unassigned' });
  }

  return options;
}

export function buildInspectionEmployeeOptions(
  inspections: CargoInspection[],
): InspectionFilterOption[] {
  const byKey = new Map<string, string>();

  for (const inspection of inspections) {
    const key = resolveInspectionEmployeeKey(inspection);
    if (!key) continue;
    const label = formatPersonName(inspection.createdByName, inspection.createdBy);
    const existing = byKey.get(key);
    // Prefer a real display name over a bare email when available.
    if (!existing || (existing.includes('@') && !label.includes('@'))) {
      byKey.set(key, label);
    }
  }

  return Array.from(byKey.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
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
    const clientName = item.clientLocationName?.toLowerCase() ?? '';
    const author = formatPersonName(item.createdByName, item.createdBy).toLowerCase();
    return (
      uldId.includes(q) ||
      awbNumber.includes(q) ||
      foodType.includes(q) ||
      clientName.includes(q) ||
      author.includes(q)
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

export function filterInspectionsByClient(
  inspections: CargoInspection[],
  clientKey: string,
): CargoInspection[] {
  const key = clientKey.trim();
  if (!key) return inspections;
  return inspections.filter(
    (item) => resolveInspectionClientKey(item) === key,
  );
}

export function filterInspectionsByEmployee(
  inspections: CargoInspection[],
  employeeKey: string,
): CargoInspection[] {
  const key = employeeKey.trim().toLowerCase();
  if (!key) return inspections;
  return inspections.filter(
    (item) => resolveInspectionEmployeeKey(item) === key,
  );
}

export function sortInspectionsByNewest(
  inspections: CargoInspection[],
): CargoInspection[] {
  return [...inspections].sort(
    (a, b) =>
      new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
  );
}
