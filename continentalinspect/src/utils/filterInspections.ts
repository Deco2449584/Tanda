import type { CargoInspection } from '@/types';
import { formatPersonName } from '@/utils/cargoInspectionStatus';

export type DateFilterPreset = 'day' | 'week' | 'month' | 'custom';

export type DateRange = {
  from: Date;
  to: Date;
};

export type InspectionFilterOption = {
  value: string;
  label: string;
};

/** Sentinel for inspections with no client/site assigned. */
export const INSPECTION_CLIENT_UNASSIGNED = '__unassigned__';

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
    if (!existing || (existing.includes('@') && !label.includes('@'))) {
      byKey.set(key, label);
    }
  }

  return Array.from(byKey.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
}

/** Filters inspections by ULD, AWB, client name, or employee. */
export function filterInspectionsBySearch(
  inspections: CargoInspection[],
  query: string,
): CargoInspection[] {
  const q = query.trim().toLowerCase();
  if (!q) return inspections;

  return inspections.filter((item) => {
    const uldId = item.uldId.toLowerCase();
    const awbNumber = item.awbNumber.toLowerCase();
    const clientName = item.clientLocationName?.toLowerCase() ?? '';
    const author = formatPersonName(item.createdByName, item.createdBy).toLowerCase();
    return (
      uldId.includes(q) ||
      awbNumber.includes(q) ||
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
    const t = inspectionDate(item).getTime();
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

export function filterInspectionsToday(inspections: CargoInspection[]): CargoInspection[] {
  const { from, to } = getTodayRange();
  return filterInspectionsByDateRange(inspections, from, to);
}

/** Admin sees the org. Employees only see records they own. */
export function scopeInspectionsForViewer(
  inspections: CargoInspection[],
  options: {
    isAdmin: boolean;
    userId?: string | null;
    email?: string | null;
  },
): CargoInspection[] {
  if (options.isAdmin) {
    return inspections;
  }

  const uid = options.userId?.trim();
  const email = options.email?.trim().toLowerCase();

  return inspections.filter((item) => {
    if (uid && item.userId && item.userId === uid) {
      return true;
    }
    const author = item.createdBy?.trim().toLowerCase();
    if (email && author === email) {
      return true;
    }
    return Boolean(uid && author === uid);
  });
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
